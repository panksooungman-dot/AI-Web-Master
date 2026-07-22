"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { WebsiteOrderRecord, WebsiteOrderStatus } from "@/lib/websiteOrders/types";
import { WEBSITE_ORDER_STATUSES } from "@/lib/websiteOrders/types";
import type { ClientRecord } from "@/lib/clients/types";
import type { InquiryRecord } from "@/lib/inquiries/types";
import type { AiJobRecord } from "@/lib/aiJobs/types";
import type { WebsiteRecord } from "@/lib/websites/registry";

const WEBSITE_ORDER_STATUS_LABELS: Record<WebsiteOrderStatus, string> = {
  Requested: "접수",
  InProgress: "처리 중",
  Review: "검수",
  Delivered: "납품 완료",
  Cancelled: "취소",
};

const WEBSITE_ORDER_STATUS_TONES: Record<WebsiteOrderStatus, BadgeTone> = {
  Requested: "info",
  InProgress: "warning",
  Review: "purple",
  Delivered: "success",
  Cancelled: "neutral",
};

const AI_JOB_STATUS_LABELS: Record<AiJobRecord["status"], string> = {
  Queued: "대기 중",
  Running: "실행 중",
  Success: "성공",
  Failed: "실패",
  Cancelled: "취소됨",
};

const AI_JOB_STATUS_TONES: Record<AiJobRecord["status"], BadgeTone> = {
  Queued: "info",
  Running: "warning",
  Success: "success",
  Failed: "danger",
  Cancelled: "neutral",
};

/**
 * Website Order 상세 — Clients Dashboard(app/developer/clients/[id]/page.tsx)와 동일한
 * fetch-and-combine 패턴. client/inquiry는 각자의 기존 단건 GET(/api/clients/[id]·
 * /api/inquiries/[id])을, websites는 order.websiteIds로(lib/aiJobs/executor.ts의
 * addWebsiteToOrder() 호출로 실제 채워짐), AI Job은 job.websiteOrderId === order.id로
 * 필터링한다 — order.aiJobIds는 registry.ts에 함수(addAiJobToWebsiteOrder())는 있지만 실제
 * 파이프라인(app/api/external/inquiries/route.ts)에서 호출되지 않아 항상 빈 배열이므로
 * (grep으로 확인: 테스트에서만 쓰임), 실제로 채워지는 AiJobRecord.websiteOrderId 쪽으로
 * 조인한다. 두 목록 모두 기존 GET(/api/ai-jobs·/api/websites)을 그대로 사용, 새 API 없음.
 * 상태 변경·Job 재실행도 새 로직을 만들지 않고 기존 PATCH /api/website-orders/[id]·
 * POST /api/ai-jobs/[id]/run(둘 다 Inquiry 상세 페이지가 이미 쓰는 것과 동일한 엔드포인트)을
 * 그대로 재사용한다.
 */
export default function WebsiteOrderDetailPage() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] = useState<WebsiteOrderRecord | null>(null);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [inquiry, setInquiry] = useState<InquiryRecord | null>(null);
  const [aiJobs, setAiJobs] = useState<AiJobRecord[]>([]);
  const [websites, setWebsites] = useState<WebsiteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/website-orders/${params.id}`)
      .then((res) => res.json())
      .then(async (data: { websiteOrder?: WebsiteOrderRecord; error?: string }) => {
        if (!data.websiteOrder) {
          setLoadError(data.error ?? "주문을 찾을 수 없습니다.");
          return;
        }
        setOrder(data.websiteOrder);

        const [clientJson, inquiryJson, jobsJson, websitesJson] = await Promise.all([
          fetch(`/api/clients/${data.websiteOrder.clientId}`).then((res) => res.json()),
          fetch(`/api/inquiries/${data.websiteOrder.inquiryId}`).then((res) => res.json()),
          fetch("/api/ai-jobs").then((res) => res.json() as Promise<{ aiJobs?: AiJobRecord[] }>),
          fetch("/api/websites").then((res) => res.json() as Promise<{ websites?: WebsiteRecord[] }>),
        ]);

        setClient(clientJson?.client ?? null);
        setInquiry(inquiryJson?.inquiry ?? null);

        const linkedJobs = (jobsJson.aiJobs ?? []).filter(
          (job) => job.websiteOrderId === data.websiteOrder!.id
        );
        const linkedWebsites = (websitesJson.websites ?? []).filter((website) =>
          data.websiteOrder!.websiteIds.includes(website.id)
        );

        setAiJobs(linkedJobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setWebsites(linkedWebsites.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      })
      .catch(() => setLoadError("주문을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleStatusChange(status: WebsiteOrderStatus) {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const res = await fetch(`/api/website-orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data: { success: boolean; websiteOrder?: WebsiteOrderRecord; error?: string } = await res.json();

      if (!data.success || !data.websiteOrder) {
        setUpdateError(data.error ?? "상태 변경에 실패했습니다.");
        return;
      }

      setOrder(data.websiteOrder);
    } catch {
      setUpdateError("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRunJob(jobId: string) {
    setRunningJobId(jobId);
    setRunError(null);

    try {
      const res = await fetch(`/api/ai-jobs/${jobId}/run`, { method: "POST" });
      const data: { success: boolean; error?: string } = await res.json();
      if (!data.success) {
        setRunError(data.error ?? "AI Job 실행에 실패했습니다.");
      }
      load();
    } catch {
      setRunError("AI Job 실행 중 오류가 발생했습니다.");
    } finally {
      setRunningJobId(null);
    }
  }

  if (isLoading) {
    return <LoadingText />;
  }

  if (loadError || !order) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "주문을 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/website-orders" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← Website Order 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/developer/website-orders" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← Website Order 목록
      </Link>

      <PageHeader
        title={order.name}
        description={`${order.siteType} · ${client ? client.companyName || client.contactName : "고객사 미상"}`}
        actions={
          <Badge tone={WEBSITE_ORDER_STATUS_TONES[order.status]}>
            {WEBSITE_ORDER_STATUS_LABELS[order.status]}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="주문 정보" className="lg:col-span-1">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-gray-500">사이트 유형</dt>
              <dd className="text-gray-200">{order.siteType}</dd>
            </div>
            <div>
              <dt className="text-gray-500">예산</dt>
              <dd className="text-gray-200">{order.budget || "협의 가능"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">고객사</dt>
              <dd className="text-gray-200">
                {client ? (
                  <Link href={`/developer/clients/${client.id}`} className="text-blue-400 hover:underline">
                    {client.companyName || client.contactName}
                  </Link>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">접수일</dt>
              <dd className="text-gray-200">{new Date(order.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">최근 갱신</dt>
              <dd className="text-gray-200">{new Date(order.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </Card>

        <Card title="요구사항" className="lg:col-span-2">
          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{order.requirements || "-"}</p>
          {inquiry && (
            <p className="text-xs text-gray-500 mt-3">
              원본 Inquiry:{" "}
              <Link href={`/developer/inquiries/${inquiry.id}`} className="text-blue-400 hover:underline">
                {inquiry.id}
              </Link>
            </p>
          )}
        </Card>
      </div>

      <Card title={`AI Job (${aiJobs.length}건)`} className="mb-6">
        {aiJobs.length === 0 ? (
          <p className="text-gray-500 text-sm">연결된 AI Job이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {aiJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
              >
                <Badge tone={AI_JOB_STATUS_TONES[job.status]} className="w-20 text-center">
                  {AI_JOB_STATUS_LABELS[job.status]}
                </Badge>
                <span className="font-mono text-xs text-gray-500">{job.id}</span>
                <span className="text-xs text-gray-400">{job.type}</span>
                {job.error && <span className="text-xs text-red-400 truncate">{job.error}</span>}
                <div className="sm:ml-auto">
                  {(job.status === "Failed" || job.status === "Queued") && (
                    <button
                      onClick={() => handleRunJob(job.id)}
                      disabled={runningJobId === job.id}
                      className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {runningJobId === job.id ? "실행 중..." : job.status === "Failed" ? "재실행" : "지금 실행"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {runError && <StatusMessage tone="error" className="mt-2">{runError}</StatusMessage>}
      </Card>

      <Card title={`생성된 Website (${websites.length}건)`} className="mb-6">
        {websites.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 생성된 Website가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {websites.map((website) => (
              <div
                key={website.id}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
              >
                <Badge tone={website.status === "Success" ? "success" : "danger"} className="w-20 text-center">
                  {website.status === "Success" ? "성공" : "실패"}
                </Badge>
                {website.simulatedContent && <Badge tone="warning">Simulated</Badge>}
                <span className="text-gray-200">{website.name}</span>
                <span className="text-xs text-gray-400">{new Date(website.createdAt).toLocaleString()}</span>
                <span className="font-mono text-xs text-gray-500 truncate">{website.outDir}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="상태 변경">
        <div className="flex flex-wrap gap-2">
          {WEBSITE_ORDER_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={isUpdating || status === order.status}
              className={`rounded px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                status === order.status ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {WEBSITE_ORDER_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        {updateError && <StatusMessage tone="error" className="mt-3">{updateError}</StatusMessage>}
      </Card>
    </div>
  );
}
