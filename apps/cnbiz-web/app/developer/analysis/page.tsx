import Link from "next/link";
import { PageHeader } from "@/components/developer/PageHeader";
import { Card } from "@/components/developer/Card";
import { Badge } from "@/components/developer/Badge";
import { DocList } from "@/components/developer/DocList";
import { resolveRepoRoot } from "@/lib/paths/repoRoot";
import { readDocEntry, joinRepoPath } from "@/lib/docs/readDocEntry";
import { listInquiries } from "@/lib/inquiries/registry";

// 요청 시점 데이터(Inquiry 목록)를 읽으므로 정적 프리렌더 대상에서 제외한다.
export const dynamic = "force-dynamic";

const DOC_TARGETS: Array<{ label: string; segments: string[] }> = [
  { label: "프로젝트 현황 (SSOT)", segments: ["PROJECT_STATUS.md"] },
  { label: "의뢰 요구사항", segments: ["docs", "01_PMO", "REQUEST.md"] },
  { label: "CNBIZ.KR v2 요구사항", segments: ["apps", "cnbiz-web", "REQUEST.md"] },
  { label: "프로젝트 배경 분석", segments: ["docs", "07_KNOWLEDGE", "001-project-foundation.md"] },
];

function topEntries(counts: Map<string, number>, limit: number): Array<[string, number]> {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export default async function AnalysisPhasePage() {
  const repoRoot = resolveRepoRoot();
  const docs = DOC_TARGETS.map(({ label, segments }) => {
    const { absolute, display } = joinRepoPath(repoRoot, ...segments);
    return readDocEntry(label, absolute, display);
  });

  const inquiries = await listInquiries();
  const analyzed = inquiries.filter((i) => i.analysis);
  const avgCompleteness =
    analyzed.length > 0
      ? Math.round(analyzed.reduce((sum, i) => sum + (i.analysis?.completeness ?? 0), 0) / analyzed.length)
      : null;

  const businessTypeCounts = new Map<string, number>();
  const missingItemCounts = new Map<string, number>();
  for (const inquiry of analyzed) {
    const type = inquiry.analysis?.detectedBusinessType;
    if (type) businessTypeCounts.set(type, (businessTypeCounts.get(type) ?? 0) + 1);
    for (const item of inquiry.analysis?.missingItems ?? []) {
      if (!item.required) continue;
      missingItemCounts.set(item.title, (missingItemCounts.get(item.title) ?? 0) + 1);
    }
  }

  return (
    <div>
      <PageHeader
        icon="🔎"
        title="Phase 01 · Analysis"
        description="기존 분석 문서(SSOT·요구사항)와 AI Analysis Engine(lib/ai-analysis) 결과를 한 화면에서 연결해 보여줍니다. 새 분석 로직은 없습니다 — 전부 기존 문서·기존 API(listInquiries)를 읽어 온 값입니다."
        actions={
          <div className="flex items-center gap-4">
            <Link href="/developer/inquiries" className="text-xs text-blue-400 hover:underline">
              ← AI 의뢰 관리
            </Link>
            <Link href="/developer/planning" className="text-xs text-blue-400 hover:underline">
              Planning →
            </Link>
          </div>
        }
      />

      <Card title="AI 분석 현황 (기존 lib/ai-analysis 결과 집계)" className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">전체 의뢰</p>
            <p className="text-2xl font-bold">{inquiries.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">AI 분석 완료</p>
            <p className="text-2xl font-bold">{analyzed.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">평균 완성도</p>
            <p className="text-2xl font-bold">{avgCompleteness !== null ? `${avgCompleteness}점` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">미분석</p>
            <p className="text-2xl font-bold">{inquiries.length - analyzed.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">업종 분포 (detectedBusinessType)</p>
            {businessTypeCounts.size === 0 ? (
              <p className="text-sm text-gray-600">데이터 없음</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {topEntries(businessTypeCounts, 8).map(([type, count]) => (
                  <Badge key={type} tone="accent">
                    {type} ({count})
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">자주 부족한 필수 항목 (missingItems)</p>
            {missingItemCounts.size === 0 ? (
              <p className="text-sm text-gray-600">데이터 없음</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {topEntries(missingItemCounts, 8).map(([title, count]) => (
                  <Badge key={title} tone="warning">
                    {title} ({count})
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <h2 className="text-lg font-bold mb-3">분석 단계 문서</h2>
      <DocList docs={docs} />
    </div>
  );
}
