"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { InquiryGeneratePicker } from "@/components/developer/InquiryGeneratePicker";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { isCompanyNameStale, useInquiryCompanyNames } from "@/lib/hooks/useInquiryCompanyNames";
import type { SpecificationRecord } from "@/lib/specifications/types";

interface SpecificationsResponse {
  specifications: SpecificationRecord[];
}

/**
 * 기능 명세서 목록. app/developer/estimates/page.tsx와 완전히 동일한 패턴 —
 * InquiryGeneratePicker로 의뢰를 검색·선택해 바로 생성 가능(2026-09-14).
 */
export default function SpecificationsPage() {
  const [specifications, setSpecifications] = useState<SpecificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const inquiryCompanyNames = useInquiryCompanyNames();

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

  async function handleDelete(e: React.MouseEvent, specification: SpecificationRecord) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`"${specification.input.companyName}" 기능 명세서를 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingId(specification.id);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/specifications/${specification.id}`, { method: "DELETE" });
      const data: { success: boolean; error?: string } = await res.json();

      if (!data.success) {
        setDeleteError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      setSpecifications((prev) => prev.filter((item) => item.id !== specification.id));
    } catch {
      setDeleteError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon="📋"
        title="기능 명세서"
        description="AI Analysis Engine의 분석 결과를 기반으로 자동 생성된 기능 명세서 목록입니다."
        help={[
          "아래에서 의뢰를 검색·선택해 바로 생성하거나, 'AI 의뢰 관리' 상세 화면에서도 생성할 수 있습니다.",
          "수정 기능은 없습니다.",
        ]}
        actions={
          <button onClick={load} className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors">
            Refresh
          </button>
        }
      />

      <InquiryGeneratePicker
        title="🔗 의뢰 선택 후 기능 명세서 생성"
        description="의뢰를 선택하면 AI 분석 결과를 기반으로 기능 명세서를 바로 생성합니다."
        generateLabel="명세서 생성"
        onGenerate={async (inquiryId) => {
          const res = await fetch("/api/specifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inquiryId }),
          });
          const data: { success: boolean; specification?: SpecificationRecord; error?: string } = await res.json();
          if (data.success && data.specification) {
            setSpecifications((prev) => [data.specification!, ...prev]);
          }
          return { success: data.success, error: data.error };
        }}
      />

      {deleteError && <StatusMessage tone="error" className="mb-4">{deleteError}</StatusMessage>}

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
                {isCompanyNameStale(inquiryCompanyNames.get(specification.inquiryId), specification.input.companyName) && (
                  <Badge tone="warning">
                    ⚠ 현재 의뢰명: {inquiryCompanyNames.get(specification.inquiryId)}
                  </Badge>
                )}

                <button
                  onClick={(e) => handleDelete(e, specification)}
                  disabled={deletingId === specification.id}
                  className="shrink-0 rounded bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {deletingId === specification.id ? "삭제 중..." : "삭제"}
                </button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
