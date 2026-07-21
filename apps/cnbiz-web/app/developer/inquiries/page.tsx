"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { InquiryRecord } from "@/lib/inquiries/types";
import type { AiJobRecord } from "@/lib/aiJobs/types";

interface InquiriesResponse {
  inquiries: InquiryRecord[];
}

interface AiJobsResponse {
  aiJobs: AiJobRecord[];
}

/**
 * Inquiry 자체의 status("New"|"Qualified"|"Converted"|"Rejected")는 Client/WebsiteOrder에
 * 연결되는 순간 바로 "Converted"로 넘어가 버려 "지금 AI가 분석/생성 중인지"를 보여주지 못한다.
 * 실제 진행 상태는 연결된 WebsiteOrder의 최신 AiJob이 갖고 있으므로, 두 목록을 합쳐 화면에서만
 * 파생 상태를 계산한다 — Inquiry/AiJob 어느 쪽 타입·저장 로직도 건드리지 않는다.
 */
type DisplayStatus = { label: string; tone: BadgeTone };

const REJECTED_STATUS: DisplayStatus = { label: "반려", tone: "danger" };
const NEW_STATUS: DisplayStatus = { label: "신규 접수", tone: "info" };

const JOB_STATUS_DISPLAY: Record<AiJobRecord["status"], DisplayStatus> = {
  Queued: { label: "AI 분석 대기", tone: "info" },
  Running: { label: "AI 분석·생성 중", tone: "warning" },
  Success: { label: "생성 완료", tone: "success" },
  Failed: { label: "생성 실패", tone: "danger" },
  Cancelled: { label: "취소됨", tone: "neutral" },
};

function latestJobFor(inquiry: InquiryRecord, aiJobs: AiJobRecord[]): AiJobRecord | undefined {
  if (!inquiry.websiteOrderId) return undefined;
  const jobs = aiJobs.filter((job) => job.websiteOrderId === inquiry.websiteOrderId);
  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function displayStatusFor(inquiry: InquiryRecord, aiJobs: AiJobRecord[]): DisplayStatus {
  if (inquiry.status === "Rejected") return REJECTED_STATUS;
  const job = latestJobFor(inquiry, aiJobs);
  if (!job) return NEW_STATUS;
  return JOB_STATUS_DISPLAY[job.status];
}

const FILTERS = ["All", "신규 접수", "AI 분석 대기", "AI 분석·생성 중", "생성 완료", "생성 실패", "취소됨", "반려"] as const;

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [aiJobs, setAiJobs] = useState<AiJobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/inquiries").then((res) => res.json() as Promise<InquiriesResponse>),
      fetch("/api/ai-jobs").then((res) => res.json() as Promise<AiJobsResponse>),
    ])
      .then(([inquiriesJson, aiJobsJson]) => {
        setInquiries(inquiriesJson.inquiries ?? []);
        setAiJobs(aiJobsJson.aiJobs ?? []);
      })
      .catch(() => setLoadError("의뢰 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const filtered = inquiries.filter((inquiry) => {
    if (filter === "All") return true;
    return displayStatusFor(inquiry, aiJobs).label === filter;
  });

  return (
    <div>
      <PageHeader
        icon="🤖"
        title="AI 의뢰 관리"
        description="CNBIZ.AI.KR 챗봇 상담·설문에서 접수되어 AiJob(Website Builder) 파이프라인으로 자동 연결된 의뢰 목록입니다."
        actions={
          <>
            <Link
              href="/developer/analysis"
              className="text-xs text-blue-400 hover:underline self-center"
            >
              AI 분석 현황 →
            </Link>
            <Link
              href="/developer/inquiries/new"
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors"
            >
              + 새 문의 등록
            </Link>
            <button
              onClick={load}
              className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
            >
              Refresh
            </button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`rounded-full border px-4 py-1 text-sm font-semibold transition-colors ${
              filter === option
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">접수된 의뢰가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((inquiry) => {
            const status = displayStatusFor(inquiry, aiJobs);
            return (
              <Link key={inquiry.id} href={`/developer/inquiries/${inquiry.id}`}>
                <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-blue-600 transition-colors">
                  <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                    {new Date(inquiry.createdAt).toLocaleString()}
                  </span>

                  <Badge tone={status.tone} className="w-32 text-center">
                    {status.label}
                  </Badge>

                  <span className="text-sm font-semibold text-white w-40 shrink-0 truncate">
                    {inquiry.companyName || inquiry.contactName}
                  </span>

                  <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{inquiry.contactName}</span>

                  <span className="text-xs text-gray-400 w-28 shrink-0 truncate">{inquiry.siteType || "-"}</span>

                  <p className="flex-1 text-sm text-gray-300 truncate">{inquiry.requirements}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
