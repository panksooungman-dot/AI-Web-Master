"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { StatusMessage } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import { buildDesignPlanInputFromPlanning } from "@/lib/planning/design-plan-adapter";
import type { PlanningContent } from "@/lib/planning/types";
import type { AiJobRecord, AiJobStatus } from "@/lib/aiJobs/types";
import type { InquiryRecord } from "@/lib/inquiries/types";

const STATUS_TONES: Record<AiJobStatus, BadgeTone> = {
  Queued: "info",
  Running: "warning",
  Success: "success",
  Failed: "danger",
  Cancelled: "neutral",
};

function formatCurrency(amount: number, currency: string): string {
  return `${amount.toLocaleString("ko-KR")} ${currency}`;
}

interface PlanningJobCardProps {
  job: AiJobRecord;
  inquiry: InquiryRecord | null;
}

/**
 * AI Business OS Phase 3(Planning) 결과 1건. `job.result`(AiJobRecord의 기존 필드 — 새 저장소
 * 아님, lib/aiJobs/executor.ts의 executePlanningJob() 참고)를 PlanningContent로 그대로 읽어
 * 표시한다. "Design Automation으로 전달" 버튼은 lib/planning/design-plan-adapter.ts(순수 매핑,
 * fs·AI 호출 없음)로 입력을 만든 뒤 Design Automation의 기존·미변경 진입점
 * (POST /api/design/requirements)을 그대로 호출한다 — Design Automation 코드는 전혀 건드리지 않는다.
 */
export function PlanningJobCard({ job, inquiry }: PlanningJobCardProps) {
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [designPlanId, setDesignPlanId] = useState<string | null>(null);

  const result = job.result as (PlanningContent & { simulated?: boolean; provider?: string | null }) | null;

  const handleSendToDesignAutomation = async () => {
    if (!inquiry || !result) return;
    setIsSending(true);
    setSendError(null);

    try {
      const input = buildDesignPlanInputFromPlanning(inquiry, result);
      const res = await fetch("/api/design/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as { success: boolean; plan?: { id: string }; error?: string };

      if (!json.success || !json.plan) {
        setSendError(json.error ?? "전달 실패");
        return;
      }

      setDesignPlanId(json.plan.id);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="rounded border border-gray-800 bg-gray-950 p-3"
      {...componentMarker("PlanningJobCard", "components/developer/planning/PlanningJobCard.tsx")}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge tone={STATUS_TONES[job.status]}>{job.status}</Badge>
        {result?.simulated && <Badge tone="warning">Simulated</Badge>}
        <span className="font-semibold text-sm text-gray-200">
          {inquiry?.companyName || inquiry?.contactName || job.payload.inquiryId as string}
        </span>
        <span className="text-xs text-gray-500 ml-auto">{new Date(job.createdAt).toLocaleString()}</span>
      </div>

      {job.status === "Failed" && (
        <StatusMessage tone="error">{job.error ?? "Planning 생성 실패"}</StatusMessage>
      )}

      {result && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-gray-400 hover:text-gray-200">문서 보기 (Specification · Estimate · Timeline)</summary>

          <div className="mt-3 flex flex-col gap-4">
            <div>
              <p className="font-semibold text-gray-200 mb-1">기능 명세서</p>
              <p className="text-gray-400 mb-2">{result.specification.overview}</p>
              <p className="text-xs text-gray-500 mb-1">페이지: {result.specification.pages.map((p) => p.name).join(", ") || "-"}</p>
              <p className="text-xs text-gray-500">
                기능:{" "}
                {result.specification.functions.map((fn) => `${fn.name}(${fn.priority})`).join(", ") || "-"}
              </p>
            </div>

            <div>
              <p className="font-semibold text-gray-200 mb-1">기술 견적서</p>
              <ul className="text-xs text-gray-400 flex flex-col gap-0.5">
                {result.estimate.lineItems.map((item, i) => (
                  <li key={i}>
                    {item.name} — {formatCurrency(item.amount, result.estimate.currency)}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-200 mt-1">
                합계: {formatCurrency(result.estimate.total, result.estimate.currency)} (예비비 포함)
              </p>
            </div>

            <div>
              <p className="font-semibold text-gray-200 mb-1">프로젝트 일정</p>
              <ul className="text-xs text-gray-400 flex flex-col gap-0.5">
                {result.timeline.phases.map((phase, i) => (
                  <li key={i}>
                    {phase.name} — {phase.durationDays}일 (D+{phase.startOffsetDays})
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-200 mt-1">총 소요 기간: {result.timeline.totalDurationDays}일</p>
            </div>

            <div>
              {designPlanId ? (
                <StatusMessage tone="success">
                  Design Automation으로 전달됨 —{" "}
                  <Link href="/developer/design" className="underline">
                    Design Plan 보기 →
                  </Link>
                </StatusMessage>
              ) : (
                <button
                  onClick={handleSendToDesignAutomation}
                  disabled={isSending || !inquiry}
                  className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSending ? "전달 중..." : "Design Automation으로 전달"}
                </button>
              )}
              {sendError && <StatusMessage tone="error">{sendError}</StatusMessage>}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
