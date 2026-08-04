"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { TimelineRecord } from "@/lib/timeline/types";

interface TimelineResponse {
  timeline?: TimelineRecord;
  error?: string;
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(timeline: TimelineRecord): string {
  const { input, result } = timeline;
  const lines = [
    `# 프로젝트 일정 — ${input.companyName}`,
    "",
    `- 업종: ${input.detectedBusinessType}`,
    `- 전체 기간: ${result.totalDurationWeeks}주 (${result.totalDurationDays}일)`,
    `- 생성일: ${new Date(timeline.createdAt).toLocaleString()}`,
    "",
    "## 개요",
    result.overview,
    "",
    "## Phase",
    ...result.phases.map(
      (phase) => `- **${phase.name}**(D+${phase.startOffsetDays} ~ D+${phase.startOffsetDays + phase.durationDays}) — ${phase.description}`
    ),
    "",
    "## Milestone",
    ...result.milestones.map((m) => `- **${m.name}**(D+${m.dueOffsetDays}) — ${m.description}`),
    "",
    "## Week별 일정",
    ...result.weeklyPlan.map((week) => `- **Week ${week.weekNumber}** (${week.focus}): ${week.tasks.join(", ")}`),
    "",
    "## 가정 사항",
    ...result.assumptions.map((a) => `- ${a}`),
  ];
  return lines.join("\n");
}

export default function TimelineDetailPage() {
  const params = useParams<{ id: string }>();

  const [timeline, setTimeline] = useState<TimelineRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setIsLoading(true);
      setLoadError(null);
    });

    fetch(`/api/timeline/${params.id}`)
      .then((res) => res.json())
      .then((data: TimelineResponse) => {
        if (!data.timeline) {
          setLoadError(data.error ?? "프로젝트 일정을 찾을 수 없습니다.");
          return;
        }
        setTimeline(data.timeline);
      })
      .catch(() => setLoadError("프로젝트 일정을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) return <LoadingText />;

  if (loadError || !timeline) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "프로젝트 일정을 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/timeline" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 프로젝트 일정 목록으로
        </Link>
      </div>
    );
  }

  const { input, result } = timeline;

  return (
    <div>
      <Link href="/developer/timeline" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← 프로젝트 일정 목록
      </Link>
      <Link href={`/developer/inquiries/${timeline.inquiryId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        원본 의뢰 보기 →
      </Link>
      <Link href={`/developer/estimates/${timeline.estimateId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        기술 견적서 보기 →
      </Link>
      <Link href={`/developer/specifications/${timeline.specificationId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        기능 명세서 보기 →
      </Link>

      <PageHeader
        title={`프로젝트 일정 — ${input.companyName}`}
        description={`${input.detectedBusinessType} · ${new Date(timeline.createdAt).toLocaleString()}`}
        actions={timeline.simulated ? <Badge tone="warning">Simulated</Badge> : <Badge tone="success">AI 생성</Badge>}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => downloadBlob(JSON.stringify(timeline, null, 2), `timeline-${timeline.id}.json`, "application/json")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export JSON
        </button>
        <button
          onClick={() => downloadBlob(toMarkdown(timeline), `timeline-${timeline.id}.md`, "text/markdown")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export Markdown
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="전체 기간">
          <p className="text-2xl font-bold text-gray-100">{result.totalDurationWeeks}주</p>
          <p className="text-sm text-gray-500">{result.totalDurationDays}일</p>
        </Card>
        <Card title="Phase 수">
          <p className="text-2xl font-bold text-gray-100">{result.phases.length}개</p>
        </Card>
        <Card title="Milestone 수">
          <p className="text-2xl font-bold text-gray-100">{result.milestones.length}개</p>
        </Card>
      </div>

      <Card title="개요" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.overview}</p>
      </Card>

      <Card title="Phase" className="mb-6">
        <div className="flex flex-col gap-2">
          {result.phases.map((phase, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2"
            >
              <span className="font-semibold text-gray-200 sm:w-28 shrink-0">{phase.name}</span>
              <span className="text-xs text-gray-400 flex-1">{phase.description}</span>
              <Badge tone="accent">
                D+{phase.startOffsetDays} ~ D+{phase.startOffsetDays + phase.durationDays}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Milestone" className="mb-6">
        <div className="flex flex-col gap-2">
          {result.milestones.map((milestone, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2"
            >
              <span className="font-semibold text-gray-200 sm:w-32 shrink-0">{milestone.name}</span>
              <span className="text-xs text-gray-400 flex-1">{milestone.description}</span>
              <Badge tone="purple">D+{milestone.dueOffsetDays}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Week별 일정" className="mb-6">
        <div className="flex flex-col gap-2">
          {result.weeklyPlan.map((week) => (
            <div key={week.weekNumber} className="rounded border border-gray-800 bg-gray-950 px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Badge tone="info">Week {week.weekNumber}</Badge>
                <span className="text-sm font-semibold text-gray-200">{week.focus}</span>
              </div>
              <ul className="list-disc list-inside text-xs text-gray-400 flex flex-col gap-0.5">
                {week.tasks.map((task, i) => (
                  <li key={i}>{task}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title="가정 사항">
        <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
          {result.assumptions.map((assumption, i) => (
            <li key={i}>{assumption}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
