import Link from "next/link";
import { PageHeader } from "@/components/developer/PageHeader";
import { Card } from "@/components/developer/Card";
import { Badge } from "@/components/developer/Badge";
import { DocList } from "@/components/developer/DocList";
import { resolveRepoRoot } from "@/lib/paths/repoRoot";
import { readDocEntry, joinRepoPath } from "@/lib/docs/readDocEntry";
import { readCiWorkflows } from "@/lib/docs/readCiWorkflows";
import { getGitStatus, readHealthCache } from "@/lib/health/checks";

// 요청 시점 데이터(Git 상태·Health 캐시)를 읽으므로 정적 프리렌더 대상에서 제외한다.
export const dynamic = "force-dynamic";

const DOC_TARGETS: Array<{ label: string; segments: string[] }> = [
  { label: "배포 가이드", segments: ["docs", "04_OPERATIONS", "DEPLOYMENT.md"] },
  { label: "릴리스 체크리스트", segments: ["docs", "RELEASE_CHECKLIST.md"] },
  { label: "프로덕션 검증 기록", segments: ["docs", "PRODUCTION_VALIDATION.md"] },
];

export default async function DeploymentPhasePage() {
  const repoRoot = resolveRepoRoot();
  const docs = DOC_TARGETS.map(({ label, segments }) => {
    const { absolute, display } = joinRepoPath(repoRoot, ...segments);
    return readDocEntry(label, absolute, display);
  });

  const ciWorkflows = readCiWorkflows(repoRoot);
  const [git, healthCache] = await Promise.all([
    getGitStatus(process.cwd()),
    Promise.resolve(readHealthCache()),
  ]);

  return (
    <div>
      <PageHeader
        icon="🚀"
        title="Phase 09 · Deployment"
        description="기존 배포 문서와 실제 CI 파이프라인 정의(.github/workflows), 기존 Health 시스템(lib/health/checks — /api/health와 동일 함수)을 연결해 보여줍니다. 새 배포 실행 로직은 없습니다."
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/developer/planning" className="text-xs text-blue-400 hover:underline">
              ← Planning
            </Link>
            <Link href="/developer/health" className="text-xs text-blue-400 hover:underline">
              Health Check
            </Link>
            <Link href="/developer/design" className="text-xs text-blue-400 hover:underline">
              Design
            </Link>
            <Link href="/developer/websites" className="text-xs text-blue-400 hover:underline">
              Website Builder
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Git 상태 (기존 lib/health/checks 재사용)">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Branch</span>
              <span className="font-mono text-gray-200">{git.branch ?? "알 수 없음"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Status</span>
              <Badge tone={git.clean ? "success" : "warning"}>{git.clean ? "Clean" : "변경사항 있음"}</Badge>
            </div>
          </div>
        </Card>

        <Card title="최근 Health Check 캐시 (Build / Test / Coverage)">
          {(["build", "test", "coverage"] as const).map((id) => {
            const result = healthCache[id];
            return (
              <div key={id} className="flex items-center gap-2 text-sm py-1 border-b border-gray-800 last:border-0">
                <span className="w-24 text-gray-500 capitalize">{id}</span>
                {result ? (
                  <>
                    <Badge tone={result.success ? "success" : "danger"}>{result.success ? "Success" : "Failed"}</Badge>
                    <span className="text-xs text-gray-500">{new Date(result.ranAt).toLocaleString()}</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-600">/developer/health 에서 실행된 기록 없음</span>
                )}
              </div>
            );
          })}
        </Card>
      </div>

      <Card title="CI 파이프라인 (.github/workflows — 정적 파일 목록)" className="mb-6">
        {ciWorkflows.length === 0 ? (
          <p className="text-sm text-gray-600">워크플로 파일을 찾을 수 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ciWorkflows.map((wf) => (
              <div
                key={wf.file}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-gray-200">{wf.name ?? wf.file}</span>
                <span className="text-xs text-gray-500 font-mono">{wf.file}</span>
                <div className="flex flex-wrap gap-1">
                  {wf.triggers.map((t) => (
                    <Badge key={t} tone="neutral">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <h2 className="text-lg font-bold mb-3">배포 단계 문서</h2>
      <DocList docs={docs} />
    </div>
  );
}
