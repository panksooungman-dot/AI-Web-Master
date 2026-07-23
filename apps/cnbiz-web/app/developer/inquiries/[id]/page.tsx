"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { InquiryRecord, InquiryStatus } from "@/lib/inquiries/types";
import { INQUIRY_STATUSES } from "@/lib/inquiries/types";
import type { ClientRecord } from "@/lib/clients/types";
import type { WebsiteOrderRecord } from "@/lib/websiteOrders/types";
import type { AiJobRecord } from "@/lib/aiJobs/types";

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  New: "신규",
  Qualified: "검토됨",
  Converted: "전환됨",
  Rejected: "반려",
};

const INQUIRY_STATUS_TONES: Record<InquiryStatus, BadgeTone> = {
  New: "info",
  Qualified: "warning",
  Converted: "success",
  Rejected: "danger",
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

export default function InquiryDetailPage() {
  const params = useParams<{ id: string }>();

  const [inquiry, setInquiry] = useState<InquiryRecord | null>(null);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [websiteOrder, setWebsiteOrder] = useState<WebsiteOrderRecord | null>(null);
  const [aiJobs, setAiJobs] = useState<AiJobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/inquiries/${params.id}`)
      .then((res) => res.json())
      .then(async (data: { inquiry?: InquiryRecord; error?: string }) => {
        if (!data.inquiry) {
          setLoadError(data.error ?? "의뢰를 찾을 수 없습니다.");
          return;
        }
        setInquiry(data.inquiry);

        const [clientResult, orderResult, jobsResult] = await Promise.all([
          data.inquiry.clientId
            ? fetch(`/api/clients/${data.inquiry.clientId}`).then((res) => res.json())
            : Promise.resolve(null),
          data.inquiry.websiteOrderId
            ? fetch(`/api/website-orders/${data.inquiry.websiteOrderId}`).then((res) => res.json())
            : Promise.resolve(null),
          fetch("/api/ai-jobs").then((res) => res.json()),
        ]);

        setClient(clientResult?.client ?? null);
        setWebsiteOrder(orderResult?.websiteOrder ?? null);

        const allJobs: AiJobRecord[] = jobsResult?.aiJobs ?? [];
        const linkedJobs = data.inquiry.websiteOrderId
          ? allJobs
              .filter((job) => job.websiteOrderId === data.inquiry!.websiteOrderId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          : [];
        setAiJobs(linkedJobs);
      })
      .catch(() => setLoadError("의뢰를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleStatusChange(status: InquiryStatus) {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const res = await fetch(`/api/inquiries/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data: { success: boolean; inquiry?: InquiryRecord; error?: string } = await res.json();

      if (!data.success || !data.inquiry) {
        setUpdateError(data.error ?? "상태 변경에 실패했습니다.");
        return;
      }

      setInquiry(data.inquiry);
    } catch {
      setUpdateError("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  }

  // 새 실행 로직을 만들지 않고 기존 POST /api/ai-jobs/[id]/run(lib/aiJobs/worker.ts의
  // processJob() 재사용)을 그대로 호출한다 — Failed Job은 관리자가 재실행, Queued Job은
  // AI Business OS Rewiring Phase 2부터 이 호출이 곧 "AI Generate Workflow 실행 승인"이다:
  // POST /api/inquiries(app/api/inquiries/route.ts)가 더 이상 AiJob을 자동 실행하지 않고
  // Queued 상태로만 만들어두므로, 관리자가 AI 분석 결과를 확인한 뒤 여기서 직접 실행을
  // 트리거해야 Website Builder가 실제로 돈다.
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

  if (loadError || !inquiry) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "의뢰를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/inquiries" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← AI 의뢰 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/developer/inquiries" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← AI 의뢰 목록
      </Link>

      <PageHeader
        title={inquiry.companyName || inquiry.contactName}
        description={`${inquiry.contactName} · ${inquiry.industry || inquiry.siteType || "업종/유형 미상"} · ${inquiry.source === "chatbot" ? "CNBIZ.AI.KR 챗봇" : "수동 등록"}`}
        actions={<Badge tone={INQUIRY_STATUS_TONES[inquiry.status]}>{INQUIRY_STATUS_LABELS[inquiry.status]}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="고객 정보" className="lg:col-span-1">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-gray-500">이메일</dt>
              <dd className="text-gray-200">{inquiry.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">연락처</dt>
              <dd className="text-gray-200">{inquiry.phone || "-"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">업종</dt>
              <dd className="text-gray-200">{inquiry.industry || "-"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">예산</dt>
              <dd className="text-gray-200">{inquiry.budget || "협의 가능"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">접수일</dt>
              <dd className="text-gray-200">{new Date(inquiry.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </Card>

        <Card title="AI 상담 내용" className="lg:col-span-2">
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">상담 요약</p>
              <p className="text-gray-200 whitespace-pre-wrap break-words">{inquiry.requirements || "-"}</p>
            </div>

            {inquiry.survey && Object.keys(inquiry.survey).length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">설문 응답</p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(inquiry.survey).map(([question, answer]) => (
                    <div key={question} className="rounded border border-gray-800 bg-gray-950 px-3 py-2">
                      <dt className="text-xs text-gray-500">{question}</dt>
                      <dd className="text-gray-200 break-words">{String(answer)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {inquiry.uploadedFiles && inquiry.uploadedFiles.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">첨부파일</p>
                <ul className="flex flex-col gap-1">
                  {inquiry.uploadedFiles.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline break-all"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title="AI 분석" className="mb-6">
        {!inquiry.analysis ? (
          <p className="text-gray-500 text-sm">
            아직 분석되지 않았습니다{inquiry.source === "chatbot" ? " (챗봇 접수 직후 자동 실행되며, 실패한 경우 여기에 표시되지 않습니다)" : ""}.
          </p>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-gray-500 mb-1">Completeness</p>
                <Badge
                  tone={
                    inquiry.analysis.completeness >= 80
                      ? "success"
                      : inquiry.analysis.completeness >= 50
                        ? "warning"
                        : "danger"
                  }
                >
                  {inquiry.analysis.completeness}점
                </Badge>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Business Type</p>
                <Badge tone="accent">{inquiry.analysis.detectedBusinessType}</Badge>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Confidence</p>
                <Badge tone="neutral">{Math.round(inquiry.analysis.confidence * 100)}%</Badge>
              </div>
              {inquiry.analyzedAt && (
                <div>
                  <p className="text-gray-500 mb-1">분석 시각</p>
                  <p className="text-gray-300">{new Date(inquiry.analyzedAt).toLocaleString()}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-gray-500 mb-1">Summary</p>
              <p className="text-gray-200 whitespace-pre-wrap break-words">{inquiry.analysis.summary}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 mb-1">Recommended Pages</p>
                <div className="flex flex-wrap gap-1.5">
                  {inquiry.analysis.recommendedPages.map((page) => (
                    <Badge key={page} tone="info">
                      {page}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Recommended Functions</p>
                <div className="flex flex-wrap gap-1.5">
                  {inquiry.analysis.recommendedFunctions.map((fn) => (
                    <Badge key={fn} tone="purple">
                      {fn}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-gray-500 mb-1">Missing Items ({inquiry.analysis.missingItems.length}건)</p>
              {inquiry.analysis.missingItems.length === 0 ? (
                <p className="text-emerald-400">부족한 자료가 없습니다.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {inquiry.analysis.missingItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-start gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2"
                    >
                      <Badge tone={item.required ? "danger" : "warning"} className="shrink-0">
                        {item.required ? "필수" : "권장"}
                      </Badge>
                      <div>
                        <p className="text-gray-200 font-semibold">{item.title}</p>
                        <p className="text-gray-400 text-xs">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card title="파이프라인 진행 상황" className="mb-6">
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="accent">1. Inquiry 접수</Badge>
            <span className="text-gray-600">→</span>
            <Badge tone={client ? "accent" : "neutral"}>2. Client {client ? client.companyName || client.contactName : "생성 전"}</Badge>
            <span className="text-gray-600">→</span>
            <Badge tone={websiteOrder ? "accent" : "neutral"}>
              3. WebsiteOrder {websiteOrder ? websiteOrder.status : "생성 전"}
            </Badge>
            <span className="text-gray-600">→</span>
            <Badge tone={aiJobs.length > 0 ? "accent" : "neutral"}>
              4. AiJob(Website Builder) {aiJobs.length > 0 ? `${aiJobs.length}건` : "생성 전"}
            </Badge>
          </div>

          {aiJobs.length === 0 ? (
            <p className="text-gray-500">아직 연결된 AI Job이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {aiJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2"
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
                        {runningJobId === job.id
                          ? "실행 중..."
                          : job.status === "Failed"
                            ? "재실행"
                            : "승인 및 생성"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {runError && <StatusMessage tone="error">{runError}</StatusMessage>}
        </div>
      </Card>

      <Card title="상태 변경">
        <div className="flex flex-wrap gap-2">
          {INQUIRY_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={isUpdating || status === inquiry.status}
              className={`rounded px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                status === inquiry.status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {INQUIRY_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        {updateError && <StatusMessage tone="error" className="mt-3">{updateError}</StatusMessage>}
      </Card>
    </div>
  );
}
