"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { SpecificationRecord } from "@/lib/specifications/types";

interface SpecificationsResponse {
  specifications: SpecificationRecord[];
}

/**
 * 기능 명세서 목록 — 읽기 전용 히스토리 화면. 생성은 이 페이지가 아니라
 * /developer/inquiries/[id]의 "기능 명세서" 카드에서 수행한다(AI Analysis Engine의
 * inquiry.analysis가 있어야 생성 가능하므로, 자유 입력 폼을 별도로 두지 않는다).
 * app/developer/estimates/page.tsx와 완전히 동일한 패턴.
 */
export default function SpecificationsPage() {
  const [specifications, setSpecifications] = useState<SpecificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/specifications")
      .then((res) => res.json())
      .then((json: SpecificationsResponse) => setSpecifications(json.specifications ?? []))
      .catch(() => setLoadError("기능 명세서 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  return (
    <div>
      <PageHeader
        icon="📋"
        title="기능 명세서"
        description="AI Analysis Engine의 분석 결과를 기반으로 자동 생성된 기능 명세서 목록입니다. 생성은 AI 의뢰 상세 화면에서 수행합니다."
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
      ) : specifications.length === 0 ? (
        <p className="text-gray-500">
          아직 생성된 명세서가 없습니다.{" "}
          <Link href="/developer/inquiries" className="text-blue-400 hover:underline">
            AI 의뢰 관리로 이동
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {specifications.map((specification) => (
            <Link key={specification.id} href={`/developer/specifications/${specification.id}`}>
              <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-purple-600 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                  {new Date(specification.createdAt).toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-white w-48 shrink-0 truncate">
                  {specification.input.companyName}
                </span>
                <Badge tone="purple">페이지 {specification.result.pages.length}종</Badge>
                <span className="text-xs text-gray-400">기능 {specification.result.features.length}종</span>
                {specification.simulated && <Badge tone="warning">Simulated</Badge>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
