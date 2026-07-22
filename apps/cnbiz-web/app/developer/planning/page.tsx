import Link from "next/link";
import { PageHeader } from "@/components/developer/PageHeader";
import { Card } from "@/components/developer/Card";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { DocList } from "@/components/developer/DocList";
import { PlanningJobCard } from "@/components/developer/planning/PlanningJobCard";
import { resolveRepoRoot } from "@/lib/paths/repoRoot";
import { readDocEntry, joinRepoPath } from "@/lib/docs/readDocEntry";
import { listWorkflows } from "@/lib/workflows/registry";
import { workflowEngine } from "@/lib/workflows/engine";
import type { WorkflowRunStatus } from "@/lib/workflows/types";
import { listAiJobs } from "@/lib/aiJobs/registry";
import { getInquiry } from "@/lib/inquiries/registry";

// 요청 시점 데이터(Workflow Run 목록)를 읽으므로 정적 프리렌더 대상에서 제외한다.
export const dynamic = "force-dynamic";

const DOC_TARGETS: Array<{ label: string; segments: string[] }> = [
  { label: "WBS (작업 분해 구조)", segments: ["docs", "01_PMO", "WBS.md"] },
  { label: "프로젝트 로드맵", segments: ["docs", "01_PMO", "PROJECT_ROADMAP.md"] },
  { label: "Phase 1 MVP 계획", segments: ["docs", "08_PLANS", "001-phase1-mvp.md"] },
  { label: "Plan 템플릿", segments: ["docs", "06_TEMPLATES", "plan-template.md"] },
  { label: "WBS 템플릿", segments: ["docs", "06_TEMPLATES", "wbs-template.md"] },
];

const STATUS_TONES: Record<WorkflowRunStatus, BadgeTone> = {
  Pending: "info",
  Running: "warning",
  Paused: "neutral",
  Completed: "success",
  Failed: "danger",
  Cancelled: "neutral",
};

export default async function PlanningPhasePage() {
  const repoRoot = resolveRepoRoot();
  const docs = DOC_TARGETS.map(({ label, segments }) => {
    const { absolute, display } = joinRepoPath(repoRoot, ...segments);
    return readDocEntry(label, absolute, display);
  });

  const workflows = listWorkflows();
  const runs = workflowEngine.listRuns();

  // AI Business OS Phase 3 — Planning 문서(기술 견적서·기능 명세서·프로젝트 일정). 새 Registry를
  // 만들지 않고 기존 lib/aiJobs(AiJobRecord.result)를 그대로 읽는다 — "generate_planning" 타입만
  // 걸러서 보여준다(lib/aiJobs/executor.ts의 executePlanningJob() 참고).
  const allAiJobs = await listAiJobs();
  const planningJobs = allAiJobs.filter((job) => job.type === "generate_planning").slice(0, 10);
  const planningJobsWithInquiry = await Promise.all(
    planningJobs.map(async (job) => {
      const inquiryId = typeof job.payload.inquiryId === "string" ? job.payload.inquiryId : undefined;
      const inquiry = inquiryId ? (await getInquiry(inquiryId)) ?? null : null;
      return { job, inquiry };
    })
  );

  const statusCounts = new Map<WorkflowRunStatus, number>();
  for (const run of runs) {
    statusCounts.set(run.status, (statusCounts.get(run.status) ?? 0) + 1);
  }

  const recentRuns = [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div>
      <PageHeader
        icon="🗺️"
        title="Phase 02 · Planning"
        description="기존 기획 문서(WBS·로드맵·Plan)·Workflow Engine(lib/workflows) 실행 현황·AI Analysis 기반 자동 생성 Planning 문서(기술 견적서·기능 명세서·프로젝트 일정)를 연결해 보여줍니다. 새 Planning 엔진·Registry는 없습니다 — 각각 Workflow Center(/developer/workflows)·기존 AiJob 파이프라인(lib/aiJobs)이 이미 쓰는 것과 동일한 데이터입니다."
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/developer/analysis" className="text-xs text-blue-400 hover:underline">
              ← Analysis
            </Link>
            <Link href="/developer/inquiries" className="text-xs text-blue-400 hover:underline">
              Inquiries
            </Link>
            <Link href="/developer/workflows" className="text-xs text-blue-400 hover:underline">
              Workflow Center
            </Link>
            <Link href="/developer/design" className="text-xs text-blue-400 hover:underline">
              Design Automation
            </Link>
            <Link href="/developer/deployment" className="text-xs text-blue-400 hover:underline">
              Deployment →
            </Link>
          </div>
        }
      />

      <Card title="Planning 문서 (AI Analysis 기반 자동 생성)" className="mb-6">
        <p className="text-xs text-gray-500 mb-3">
          Inquiry 접수 시 AI Analysis 직후 자동 실행됩니다(lib/aiJobs, 타입: <code>generate_planning</code>). 최근{" "}
          {planningJobsWithInquiry.length}건.
        </p>
        {planningJobsWithInquiry.length === 0 ? (
          <p className="text-sm text-gray-600">아직 생성된 Planning 문서가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {planningJobsWithInquiry.map(({ job, inquiry }) => (
              <PlanningJobCard key={job.id} job={job} inquiry={inquiry} />
            ))}
          </div>
        )}
      </Card>

      <Card title="Workflow 실행 현황 (기존 lib/workflows 결과 집계)" className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">등록된 Workflow 정의</p>
            <p className="text-2xl font-bold">{workflows.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">전체 Run</p>
            <p className="text-2xl font-bold">{runs.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-2xl font-bold">{statusCounts.get("Completed") ?? 0}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {(Object.keys(STATUS_TONES) as WorkflowRunStatus[]).map((status) => (
            <Badge key={status} tone={STATUS_TONES[status]}>
              {status} ({statusCounts.get(status) ?? 0})
            </Badge>
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-2">최근 Run 5건</p>
        {recentRuns.length === 0 ? (
          <p className="text-sm text-gray-600">아직 실행된 Workflow Run이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
              >
                <Badge tone={STATUS_TONES[run.status]} className="w-24 text-center">
                  {run.status}
                </Badge>
                <span className="font-mono text-xs text-gray-500">{run.id}</span>
                <span className="text-xs text-gray-400">{new Date(run.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <h2 className="text-lg font-bold mb-3">기획 단계 문서</h2>
      <DocList docs={docs} />
    </div>
  );
}
