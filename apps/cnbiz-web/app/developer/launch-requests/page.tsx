"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { LaunchRequestRecord } from "@/lib/launchRequests/types";

interface LaunchRequestsResponse {
  launchRequests: LaunchRequestRecord[];
}

/**
 * 정보 요청서 목록 — 읽기 전용 히스토리 화면. 생성은 이 페이지가 아니라
 * /developer/inquiries/[id]의 "정보 요청서" 카드에서 수행한다.
 * app/developer/proposals/page.tsx와 완전히 동일한 패턴.
 */
export default function LaunchRequestsPage() {
  const [launchRequests, setLaunchRequests] = useState<LaunchRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/launch-requests")
      .then((res) => res.json())
      .then((json: LaunchRequestsResponse) => setLaunchRequests(json.launchRequests ?? []))
      .catch(() => setLoadError("정보 요청서 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  return (
    <div>
      <PageHeader
        icon="📨"
        title="정보 요청서"
        description="개발 착수 후 의뢰자에게 계정·API 키 정보를 요청하기 위해 생성한 문서 목록입니다. 생성은 AI 의뢰 상세 화면에서 수행합니다."
        help={[
          "생성은 이 화면이 아니라 'AI 의뢰 관리' 상세 화면에서 수행합니다.",
          "의뢰자가 실제로 입력하는 API 키 값은 서버에 저장되지 않습니다 — 의뢰자가 여는 공개 링크의 화면에서만 존재합니다.",
        ]}
        actions={
          <button onClick={load} className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors">
            Refresh
          </button>
        }
      />

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : launchRequests.length === 0 ? (
        <p className="text-gray-500">
          아직 생성된 정보 요청서가 없습니다.{" "}
          <Link href="/developer/inquiries" className="text-blue-400 hover:underline">
            AI 의뢰 관리로 이동
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {launchRequests.map((launchRequest) => (
            <Link key={launchRequest.id} href={`/developer/launch-requests/${launchRequest.id}`}>
              <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-purple-600 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                  {new Date(launchRequest.createdAt).toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-white w-48 shrink-0 truncate">
                  {launchRequest.companyName}
                </span>
                <Badge tone="purple">{launchRequest.services.length}개 항목</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
