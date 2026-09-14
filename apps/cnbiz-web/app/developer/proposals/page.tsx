"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { InquiryGeneratePicker } from "@/components/developer/InquiryGeneratePicker";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { isCompanyNameStale, useInquiryCompanyNames } from "@/lib/hooks/useInquiryCompanyNames";
import type { ProposalRecord } from "@/lib/proposals/types";

interface ProposalsResponse {
  proposals: ProposalRecord[];
}

/**
 * 제안서 목록. 기술 견적서·기능 명세서·프로젝트 일정·계약서 4종이 먼저 있어야 생성 가능하다는
 * 전제는 그대로 유지되며, InquiryGeneratePicker로 의뢰를 선택했을 때 그 전제가 충족되지 않으면
 * POST /api/proposals가 이미 반환하는 안내 메시지가 그대로 표시된다.
 * app/developer/{estimates,specifications,timeline,contracts}/page.tsx와 완전히 동일한
 * 패턴(2026-09-14).
 */
export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const inquiryCompanyNames = useInquiryCompanyNames();

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/proposals")
      .then((res) => res.json())
      .then((json: ProposalsResponse) => setProposals(json.proposals ?? []))
      .catch(() => setLoadError("제안서 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  async function handleDelete(e: React.MouseEvent, proposal: ProposalRecord) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`"${proposal.input.companyName}" 제안서를 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingId(proposal.id);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, { method: "DELETE" });
      const data: { success: boolean; error?: string } = await res.json();

      if (!data.success) {
        setDeleteError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      setProposals((prev) => prev.filter((item) => item.id !== proposal.id));
    } catch {
      setDeleteError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon="📊"
        title="제안서"
        description="기술 견적서·기능 명세서·프로젝트 일정·계약서를 기반으로 자동 생성된 제안서 목록입니다."
        help={[
          "견적서·명세서·일정·계약서 4종이 모두 있어야 생성할 수 있는, 자동 문서화 체인의 마지막 단계입니다.",
          "아래에서 의뢰를 검색·선택해 바로 생성하거나 'AI 의뢰 관리' 상세 화면에서도 생성할 수 있습니다.",
        ]}
        actions={
          <button onClick={load} className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors">
            Refresh
          </button>
        }
      />

      <InquiryGeneratePicker
        title="🔗 의뢰 선택 후 제안서 생성"
        description="의뢰를 선택하면 기존 기술 견적서·기능 명세서·프로젝트 일정·계약서를 기반으로 제안서를 바로 생성합니다. 하나라도 없으면 안내 메시지가 표시됩니다."
        generateLabel="제안서 생성"
        onGenerate={async (inquiryId) => {
          const res = await fetch("/api/proposals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inquiryId }),
          });
          const data: { success: boolean; proposal?: ProposalRecord; error?: string } = await res.json();
          if (data.success && data.proposal) {
            setProposals((prev) => [data.proposal!, ...prev]);
          }
          return { success: data.success, error: data.error };
        }}
      />

      {deleteError && <StatusMessage tone="error" className="mb-4">{deleteError}</StatusMessage>}

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : proposals.length === 0 ? (
        <p className="text-gray-500">
          아직 생성된 제안서가 없습니다.{" "}
          <Link href="/developer/inquiries" className="text-blue-400 hover:underline">
            AI 의뢰 관리로 이동
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {proposals.map((proposal) => (
            <Link key={proposal.id} href={`/developer/proposals/${proposal.id}`}>
              <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-purple-600 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                  {new Date(proposal.createdAt).toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-white w-48 shrink-0 truncate">
                  {proposal.input.companyName}
                </span>
                <Badge tone="purple">
                  {proposal.result.cost.amount.toLocaleString()}
                  {proposal.result.cost.currency}
                </Badge>
                {proposal.simulated && <Badge tone="warning">Simulated</Badge>}
                {isCompanyNameStale(inquiryCompanyNames.get(proposal.inquiryId), proposal.input.companyName) && (
                  <Badge tone="warning">⚠ 현재 의뢰명: {inquiryCompanyNames.get(proposal.inquiryId)}</Badge>
                )}

                <button
                  onClick={(e) => handleDelete(e, proposal)}
                  disabled={deletingId === proposal.id}
                  className="shrink-0 rounded bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {deletingId === proposal.id ? "삭제 중..." : "삭제"}
                </button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
