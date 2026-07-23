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

interface WebsiteOrderResponse {
  websiteOrder?: WebsiteOrderRecord;
  error?: string;
}

const STATUS_LABELS: Record<WebsiteOrderStatus, string> = {
  Requested: "접수",
  InProgress: "처리중",
  Review: "검수",
  Delivered: "납품완료",
  Cancelled: "취소",
};

const STATUS_TONES: Record<WebsiteOrderStatus, BadgeTone> = {
  Requested: "info",
  InProgress: "warning",
  Review: "purple",
  Delivered: "success",
  Cancelled: "danger",
};

export default function WebsiteOrderDetailPage() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] = useState<WebsiteOrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/website-orders/${params.id}`)
      .then((res) => res.json())
      .then((data: WebsiteOrderResponse) => {
        if (!data.websiteOrder) {
          setLoadError(data.error ?? "주문을 찾을 수 없습니다.");
          return;
        }
        setOrder(data.websiteOrder);
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

  if (isLoading) {
    return <LoadingText />;
  }

  if (loadError || !order) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "주문을 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/website-orders" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 주문 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/developer/website-orders" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← 주문 목록
      </Link>

      <PageHeader
        title={order.name}
        description={order.siteType}
        actions={<Badge tone={STATUS_TONES[order.status]}>{STATUS_LABELS[order.status]}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="주문 정보" className="lg:col-span-1">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-gray-500">예산</dt>
              <dd className="text-gray-200">{order.budget || "협의 가능"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">접수일</dt>
              <dd className="text-gray-200">{new Date(order.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">최근 갱신일</dt>
              <dd className="text-gray-200">{new Date(order.updatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">고객사</dt>
              <dd className="text-gray-200">
                <Link href={`/developer/clients/${order.clientId}`} className="text-blue-400 hover:underline font-mono text-xs">
                  {order.clientId}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">원본 문의</dt>
              <dd className="text-gray-200">
                <Link href={`/developer/inquiries/${order.inquiryId}`} className="text-blue-400 hover:underline font-mono text-xs">
                  {order.inquiryId}
                </Link>
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="요청 내용" className="lg:col-span-2">
          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{order.requirements}</p>
        </Card>
      </div>

      <Card title="연결된 AI Job" className="mb-6">
        {order.aiJobIds.length === 0 ? (
          <p className="text-sm text-gray-500">아직 생성된 AI Job이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {order.aiJobIds.map((jobId) => (
              <Badge key={jobId} tone="accent">
                {jobId}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card title="산출물(Website)" className="mb-6">
        {order.websiteIds.length === 0 ? (
          <p className="text-sm text-gray-500">아직 생성된 웹사이트 산출물이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {order.websiteIds.map((websiteId) => (
              <Badge key={websiteId} tone="success">
                {websiteId}
              </Badge>
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
                status === order.status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        {updateError && <StatusMessage tone="error" className="mt-3">{updateError}</StatusMessage>}
      </Card>
    </div>
  );
}
