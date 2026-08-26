"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { LaunchRequestRecord } from "@/lib/launchRequests/types";
import { getLaunchRequestCatalogItem } from "@/lib/launchRequests/catalog";

interface LaunchRequestResponse {
  launchRequest?: LaunchRequestRecord;
  error?: string;
}

export default function LaunchRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [launchRequest, setLaunchRequest] = useState<LaunchRequestRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    fetch(`/api/launch-requests/${params.id}`)
      .then((res) => res.json())
      .then((data: LaunchRequestResponse) => {
        if (!data.launchRequest) {
          setLoadError(data.error ?? "정보 요청서를 찾을 수 없습니다.");
          return;
        }
        setLaunchRequest(data.launchRequest);
      })
      .catch(() => setLoadError("정보 요청서를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  async function handleCopyLink() {
    if (!launchRequest) return;
    const publicUrl = `${window.location.origin}/launch-request/${launchRequest.id}`;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    } finally {
      setTimeout(() => setCopyStatus("idle"), 2500);
    }
  }

  if (isLoading) {
    return <LoadingText />;
  }

  if (loadError || !launchRequest) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "정보 요청서를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/launch-requests" className="text-blue-400 hover:underline text-sm mt-3 inline-block">
          ← 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon="📨"
        title={`정보 요청서 · ${launchRequest.companyName}`}
        description={`생성일: ${new Date(launchRequest.createdAt).toLocaleString()}`}
        actions={
          <Link href="/developer/launch-requests" className="text-xs text-blue-400 hover:underline">
            ← 목록
          </Link>
        }
      />

      <Card title="의뢰자에게 보낼 링크" className="mb-6">
        <p className="text-gray-500 text-sm mb-3">
          아래 링크를 의뢰자에게 전달하세요. 로그인 없이 열리며, 필요한 정보 안내와 입력란만 표시됩니다.
          입력한 값은 이 시스템에 저장되지 않고, 의뢰자가 직접 복사하거나 이메일로 전송합니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-gray-950 border border-gray-800 px-3 py-1.5 text-xs text-gray-300">
            /launch-request/{launchRequest.id}
          </code>
          <button
            onClick={handleCopyLink}
            className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            링크 복사
          </button>
          {copyStatus === "copied" && <span className="text-xs text-green-400">복사되었습니다</span>}
          {copyStatus === "failed" && <span className="text-xs text-red-400">복사에 실패했습니다</span>}
        </div>
      </Card>

      <Card title={`선택된 항목 (${launchRequest.services.length}개)`}>
        <div className="flex flex-col gap-2">
          {launchRequest.services.map((selection) => {
            const catalogItem = getLaunchRequestCatalogItem(selection.serviceId);
            return (
              <div
                key={selection.serviceId}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-gray-200">
                  {catalogItem?.icon} {catalogItem?.name ?? selection.serviceId}
                </span>
                <Badge tone={selection.required ? "warning" : "neutral"}>
                  {selection.required ? "필수" : "선택"}
                </Badge>
                {catalogItem && <span className="text-xs text-gray-500 ml-auto">{catalogItem.costLabel}</span>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
