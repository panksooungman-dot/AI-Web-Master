"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { EstimateRecord } from "@/lib/estimates/types";

interface EstimatesResponse {
  estimates: EstimateRecord[];
}

/**
 * 기술 견적서 목록 — 읽기 전용 히스토리 화면. 생성은 이 페이지가 아니라
 * /developer/inquiries/[id]의 "기술 견적서" 카드에서 수행한다(AI Analysis Engine의
 * inquiry.analysis가 있어야 생성 가능하므로, 자유 입력 폼을 별도로 두지 않는다).
 */
export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/estimates")
      .then((res) => res.json())
      .then((json: EstimatesResponse) => setEstimates(json.estimates ?? []))
      .catch(() => setLoadError("견적서 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  async function handleDelete(e: React.MouseEvent, estimate: EstimateRecord) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`"${estimate.input.companyName}" 견적서를 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingId(estimate.id);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, { method: "DELETE" });
      const data: { success: boolean; error?: string } = await res.json();

      if (!data.success) {
        setDeleteError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      setEstimates((prev) => prev.filter((item) => item.id !== estimate.id));
    } catch {
      setDeleteError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon="💰"
        title="기술 견적서"
        description="AI Analysis Engine의 분석 결과를 기반으로 자동 생성된 기술 견적서 목록입니다. 생성은 AI 의뢰 상세 화면에서 수행합니다."
        help={[
          "생성 버튼은 이 화면이 아니라 'AI 의뢰 관리' 상세 화면에 있습니다.",
          "수정 기능은 없습니다 — 새로 생성만 가능합니다.",
        ]}
        actions={
          <button onClick={load} className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors">
            Refresh
          </button>
        }
      />

      {deleteError && <StatusMessage tone="error" className="mb-4">{deleteError}</StatusMessage>}

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : estimates.length === 0 ? (
        <p className="text-gray-500">
          아직 생성된 견적서가 없습니다.{" "}
          <Link href="/developer/inquiries" className="text-blue-400 hover:underline">
            AI 의뢰 관리로 이동
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {estimates.map((estimate) => (
            <Link key={estimate.id} href={`/developer/estimates/${estimate.id}`}>
              <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-purple-600 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                  {new Date(estimate.createdAt).toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-white w-48 shrink-0 truncate">
                  {estimate.input.companyName}
                </span>
                <Badge tone="purple">
                  {estimate.result.priceRangeMin.toLocaleString()}~{estimate.result.priceRangeMax.toLocaleString()}원
                </Badge>
                <span className="text-xs text-gray-400">{estimate.result.timelineWeeks}주</span>
                {estimate.simulated && <Badge tone="warning">Simulated</Badge>}

                <button
                  onClick={(e) => handleDelete(e, estimate)}
                  disabled={deletingId === estimate.id}
                  className="shrink-0 rounded bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {deletingId === estimate.id ? "삭제 중..." : "삭제"}
                </button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
