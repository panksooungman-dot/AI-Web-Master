"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { TimelineRecord } from "@/lib/timeline/types";

interface TimelinesResponse {
  timelines: TimelineRecord[];
}

/**
 * 프로젝트 일정 목록 — 읽기 전용 히스토리 화면. 생성은 이 페이지가 아니라
 * /developer/inquiries/[id]의 "프로젝트 일정" 카드에서 수행한다(기술 견적서·기능 명세서가
 * 먼저 있어야 생성 가능하므로, 자유 입력 폼을 별도로 두지 않는다). app/developer/estimates/
 * page.tsx·app/developer/specifications/page.tsx와 완전히 동일한 패턴.
 */
export default function TimelinesPage() {
  const [timelines, setTimelines] = useState<TimelineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/timeline")
      .then((res) => res.json())
      .then((json: TimelinesResponse) => setTimelines(json.timelines ?? []))
      .catch(() => setLoadError("프로젝트 일정 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  return (
    <div>
      <PageHeader
        icon="🗓️"
        title="프로젝트 일정"
        description="기술 견적서·기능 명세서를 기반으로 자동 생성된 프로젝트 일정 목록입니다. 생성은 AI 의뢰 상세 화면에서 수행합니다."
        help={[
          "기술 견적서·기능 명세서가 둘 다 있어야 생성할 수 있습니다 — 하나라도 없으면 생성 요청이 거부됩니다.",
          "생성은 'AI 의뢰 관리' 상세 화면에서 수행합니다.",
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
      ) : timelines.length === 0 ? (
        <p className="text-gray-500">
          아직 생성된 프로젝트 일정이 없습니다.{" "}
          <Link href="/developer/inquiries" className="text-blue-400 hover:underline">
            AI 의뢰 관리로 이동
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {timelines.map((timeline) => (
            <Link key={timeline.id} href={`/developer/timeline/${timeline.id}`}>
              <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-purple-600 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                  {new Date(timeline.createdAt).toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-white w-48 shrink-0 truncate">
                  {timeline.input.companyName}
                </span>
                <Badge tone="purple">총 {timeline.result.totalDurationWeeks}주</Badge>
                <span className="text-xs text-gray-400">Phase {timeline.result.phases.length}개</span>
                {timeline.simulated && <Badge tone="warning">Simulated</Badge>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
