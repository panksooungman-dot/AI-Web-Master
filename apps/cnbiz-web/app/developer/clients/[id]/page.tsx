"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ClientRecord } from "@/lib/clients/types";
import type { InquiryRecord } from "@/lib/inquiries/types";
import type { WebsiteOrderRecord, WebsiteOrderStatus } from "@/lib/websiteOrders/types";
import type { AiJobRecord } from "@/lib/aiJobs/types";

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
 * Client 상세 — client/inquiries/websiteOrders/aiJobs 전부 기존 GET API(각 도메인의 기존
 * registry.ts를 그대로 감싸는 라우트, Inquiry 상세 페이지와 동일한 fetch-and-combine 패턴)만
 * 사용한다. ClientRecord가 이미 갖고 있는 inquiryIds/websiteOrderIds로 필터링만 하고, 새 API·새
 * 조회 로직은 만들지 않는다.
 */
export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();

  const [client, setClient] = useState<ClientRecord | null>(null);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [websiteOrders, setWebsiteOrders] = useState<WebsiteOrderRecord[]>([]);
  const [aiJobs, setAiJobs] = useState<AiJobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/clients/${params.id}`)
      .then((res) => res.json())
      .then(async (data: { client?: ClientRecord; error?: string }) => {
        if (!data.client) {
          setLoadError(data.error ?? "고객사를 찾을 수 없습니다.");
          return;
        }
        setClient(data.client);

        const [inquiriesJson, ordersJson, jobsJson] = await Promise.all([
          fetch("/api/inquiries").then((res) => res.json() as Promise<{ inquiries?: InquiryRecord[] }>),
          fetch("/api/website-orders").then(
            (res) => res.json() as Promise<{ websiteOrders?: WebsiteOrderRecord[] }>
          ),
          fetch("/api/ai-jobs").then((res) => res.json() as Promise<{ aiJobs?: AiJobRecord[] }>),
        ]);

        const linkedInquiries = (inquiriesJson.inquiries ?? []).filter((inquiry) =>
          data.client!.inquiryIds.includes(inquiry.id)
        );
        const linkedOrders = (ordersJson.websiteOrders ?? []).filter((order) =>
          data.client!.websiteOrderIds.includes(order.id)
        );
        const linkedOrderIds = new Set(linkedOrders.map((order) => order.id));
        const linkedJobs = (jobsJson.aiJobs ?? []).filter((job) => linkedOrderIds.has(job.websiteOrderId));

        setInquiries(linkedInquiries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setWebsiteOrders(linkedOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setAiJobs(linkedJobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      })
      .catch(() => setLoadError("고객사를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (isLoading) {
    return <LoadingText />;
  }

  if (loadError || !client) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "고객사를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/clients" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 고객사 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/developer/clients" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← 고객사 목록
      </Link>

      <PageHeader
        title={client.companyName || client.contactName}
        description={`${client.contactName} · ${client.email}`}
      />

      <Card title="고객사 정보" className="mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">회사명</dt>
            <dd className="text-gray-200">{client.companyName || "-"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">담당자</dt>
            <dd className="text-gray-200">{client.contactName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">이메일</dt>
            <dd className="text-gray-200">{client.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">연락처</dt>
            <dd className="text-gray-200">{client.phone || "-"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">생성일</dt>
            <dd className="text-gray-200">{new Date(client.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">최근 갱신</dt>
            <dd className="text-gray-200">{new Date(client.updatedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">연결된 Inquiry</dt>
            <dd className="text-gray-200">{client.inquiryIds.length}건</dd>
          </div>
          <div>
            <dt className="text-gray-500">연결된 Website Order</dt>
            <dd className="text-gray-200">{client.websiteOrderIds.length}건</dd>
          </div>
        </dl>
      </Card>

      <Card title={`Inquiry (${inquiries.length}건)`} className="mb-6">
        {inquiries.length === 0 ? (
          <p className="text-gray-500 text-sm">연결된 Inquiry가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {inquiries.map((inquiry) => (
              <Link key={inquiry.id} href={`/developer/inquiries/${inquiry.id}`}>
                <div className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm hover:border-blue-600 transition-colors">
                  <Badge tone="accent" className="w-24 text-center">
                    {inquiry.status}
                  </Badge>
                  <span className="font-mono text-xs text-gray-500">{inquiry.id}</span>
                  <span className="text-xs text-gray-400">{new Date(inquiry.createdAt).toLocaleString()}</span>
                  <p className="flex-1 text-gray-300 truncate">{inquiry.requirements}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Website Order (${websiteOrders.length}건)`} className="mb-6">
        {websiteOrders.length === 0 ? (
          <p className="text-gray-500 text-sm">연결된 Website Order가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {websiteOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
              >
                <Badge tone={WEBSITE_ORDER_STATUS_TONES[order.status]} className="w-24 text-center">
                  {WEBSITE_ORDER_STATUS_LABELS[order.status]}
                </Badge>
                <span className="font-mono text-xs text-gray-500">{order.id}</span>
                <span className="text-xs text-gray-400">{order.siteType}</span>
                <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</span>
                <p className="flex-1 text-gray-300 truncate">{order.name}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`AI Job (${aiJobs.length}건)`}>
        {aiJobs.length === 0 ? (
          <p className="text-gray-500 text-sm">연결된 AI Job이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {aiJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
              >
                <Badge tone={AI_JOB_STATUS_TONES[job.status]} className="w-20 text-center">
                  {AI_JOB_STATUS_LABELS[job.status]}
                </Badge>
                <span className="font-mono text-xs text-gray-500">{job.id}</span>
                <span className="text-xs text-gray-400">{job.type}</span>
                <span className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleString()}</span>
                {job.error && <span className="text-xs text-red-400 truncate">{job.error}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
