"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ProjectRequestRecord, RequestStatus } from "@/lib/requests/types";
import { REQUEST_STATUSES } from "@/lib/requests/types";

interface RequestResponse {
  request?: ProjectRequestRecord;
  error?: string;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  New: "신규",
  InReview: "검토중",
  Accepted: "진행중",
  Rejected: "반려",
  Completed: "완료",
};

const STATUS_TONES: Record<RequestStatus, BadgeTone> = {
  New: "info",
  InReview: "warning",
  Accepted: "success",
  Rejected: "danger",
  Completed: "neutral",
};

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();

  const [request, setRequest] = useState<ProjectRequestRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/requests/${params.id}`)
      .then((res) => res.json())
      .then((data: RequestResponse) => {
        if (!data.request) {
          setLoadError(data.error ?? "의뢰를 찾을 수 없습니다.");
          return;
        }
        setRequest(data.request);
      })
      .catch(() => setLoadError("의뢰를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleStatusChange(status: RequestStatus) {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const res = await fetch(`/api/requests/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data: { success: boolean; request?: ProjectRequestRecord; error?: string } = await res.json();

      if (!data.success || !data.request) {
        setUpdateError(data.error ?? "상태 변경에 실패했습니다.");
        return;
      }

      setRequest(data.request);
    } catch {
      setUpdateError("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return <LoadingText />;
  }

  if (loadError || !request) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "의뢰를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/requests" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 의뢰 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/developer/requests" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← 의뢰 목록
      </Link>

      <PageHeader
        title={request.companyName}
        description={`${request.contactName} · ${request.industry} · ${request.siteType}`}
        actions={<Badge tone={STATUS_TONES[request.status]}>{STATUS_LABELS[request.status]}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="연락처 정보" className="lg:col-span-1">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-gray-500">이메일</dt>
              <dd className="text-gray-200">{request.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">연락처</dt>
              <dd className="text-gray-200">{request.phone}</dd>
            </div>
            <div>
              <dt className="text-gray-500">예산</dt>
              <dd className="text-gray-200">{request.budget || "협의 가능"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">접수일</dt>
              <dd className="text-gray-200">{new Date(request.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </Card>

        <Card title="요청 내용" className="lg:col-span-2">
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">필요한 기능</p>
              {request.features.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {request.features.map((feature) => (
                    <Badge key={feature} tone="accent">
                      {feature}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">선택된 기능이 없습니다.</p>
              )}
            </div>

            {request.referenceSites && (
              <div>
                <p className="text-gray-500 mb-1">참고 사이트</p>
                <p className="text-gray-200 break-all">{request.referenceSites}</p>
              </div>
            )}

            <div>
              <p className="text-gray-500 mb-1">요청사항</p>
              <p className="text-gray-200 whitespace-pre-wrap break-words">{request.message}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="상태 변경">
        <div className="flex flex-wrap gap-2">
          {REQUEST_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={isUpdating || status === request.status}
              className={`rounded px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                status === request.status
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
