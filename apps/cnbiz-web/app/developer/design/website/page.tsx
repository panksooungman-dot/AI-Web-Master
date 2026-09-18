"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { DesignChainStepper } from "@/components/developer/design/DesignChainStepper";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { DesignPlanRecord } from "@/lib/design/types";
import type { ReviewRecord } from "@/lib/design/review";
import type { WebsiteBuildRecord } from "@/lib/design/website-build";
import type { WebsiteBuildJobRecord } from "@/lib/design/websiteBuildJob";
import type { DeploymentStatus, WebsiteRecord } from "@/lib/websites/registry";
import type { WebsitePreviewShareRecord } from "@/lib/websites/preview-share";
import type { BadgeTone } from "@/components/developer/Badge";

// app/developer/inquiries/[id]/page.tsx와 동일한 라벨/톤(그 화면이 이미 검증된 표준 — 여기서도
// 그대로 재사용해 같은 상태가 두 화면에서 다르게 보이지 않도록 한다).
const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
  NotStarted: "배포 전",
  PreviewReady: "미리보기 준비됨",
  Success: "운영 배포 완료",
  Failed: "배포 실패",
  NotConfigured: "배포 미설정",
};

const DEPLOYMENT_STATUS_TONES: Record<DeploymentStatus, BadgeTone> = {
  NotStarted: "neutral",
  PreviewReady: "warning",
  Success: "success",
  Failed: "danger",
  NotConfigured: "neutral",
};

interface PlansResponse {
  plans: DesignPlanRecord[];
}
interface ReviewsResponse {
  reviews: ReviewRecord[];
}
interface BuildsResponse {
  builds: WebsiteBuildRecord[];
}
interface WebsitesResponse {
  websites: WebsiteRecord[];
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

function toMarkdown(projectName: string, record: WebsiteBuildRecord, website: WebsiteRecord | null): string {
  const lines: string[] = [];
  lines.push(`# Website Builder — ${projectName} (v${record.version})`);
  lines.push("");
  lines.push(`Site Type: ${record.siteType}`);
  lines.push(`Status: ${record.status}${record.simulatedContent ? " (simulated content)" : ""}`);
  if (website) lines.push(`Output Directory: ${website.outDir}`);
  if (record.error) lines.push(`Error: ${record.error}`);
  lines.push("");

  lines.push("## History");
  for (const entry of record.history) {
    lines.push(
      `- v${entry.version} — ${entry.status}${entry.simulatedContent ? " [simulated]" : ""} — ${new Date(entry.timestamp).toLocaleString()} (${entry.actor ?? "system"})`
    );
  }

  return lines.join("\n");
}

export default function DesignWebsiteBuilderPage() {
  const [plans, setPlans] = useState<DesignPlanRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [builds, setBuilds] = useState<WebsiteBuildRecord[]>([]);
  const [websites, setWebsites] = useState<WebsiteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [outDirInput, setOutDirInput] = useState("");
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);

  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [promotingWebsiteId, setPromotingWebsiteId] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [sharingWebsiteId, setSharingWebsiteId] = useState<string | null>(null);
  const [previewShareError, setPreviewShareError] = useState<string | null>(null);
  const [previewShares, setPreviewShares] = useState<Record<string, WebsitePreviewShareRecord>>({});
  const [copiedPreviewShareId, setCopiedPreviewShareId] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/design/requirements").then((res) => res.json() as Promise<PlansResponse>),
      fetch("/api/design/review").then((res) => res.json() as Promise<ReviewsResponse>),
      fetch("/api/design/website").then((res) => res.json() as Promise<BuildsResponse>),
      fetch("/api/websites").then((res) => res.json() as Promise<WebsitesResponse>),
    ])
      .then(([plansJson, reviewsJson, buildsJson, websitesJson]) => {
        const loadedPlans = plansJson.plans ?? [];
        const loadedReviews = reviewsJson.reviews ?? [];
        const loadedBuilds = buildsJson.builds ?? [];
        const loadedWebsites = websitesJson.websites ?? [];
        setPlans(loadedPlans);
        setReviews(loadedReviews);
        setBuilds(loadedBuilds);
        setWebsites(loadedWebsites);

        const approved = loadedReviews.filter((r) => r.status === "approved");
        setSelectedReviewId((current) => current || approved[0]?.id || "");
        setSelectedBuildId((current) => current ?? loadedBuilds[0]?.id ?? null);
      })
      .catch(() => setLoadError("Website Builder 연동 데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const approvedReviews = reviews.filter((r) => r.status === "approved");

  const planForReview = (reviewId: string): DesignPlanRecord | null => {
    const review = reviews.find((r) => r.id === reviewId);
    return review ? plans.find((p) => p.id === review.planId) ?? null : null;
  };

  const reviewLabel = (reviewId: string): string => {
    const review = reviews.find((r) => r.id === reviewId);
    const name = planForReview(reviewId)?.input.projectName ?? reviewId;
    return review ? `${name} (v${review.version})` : name;
  };

  // app/developer/design/storyboard/page.tsx의 pollStoryboardJob()과 동일한 패턴 — "AI로 여러
  // 페이지 콘텐츠 생성 + GitHub 저장소 생성 + 커밋/푸시 + Vercel 프로젝트 생성·배포"를 하나의
  // 동기 요청 안에서 전부 처리하면 페이지가 많은 실제 프로젝트에서 maxDuration(300초)을 그대로
  // 넘겨버려, 정확히 5분 뒤 "Failed to execute 'json' on 'Response': Unexpected end of JSON
  // input" + History 기록 안 됨으로 재현됨을 실사용 중 확인(2026-09-18). Job 생성 즉시 응답 →
  // 별도 실행(run)이 브라우저 쪽에서 끊겨도 서버는 계속 처리 → 짧은 간격 폴링으로 결과 회수
  // 구조로 바꿨다.
  async function pollWebsiteBuildJob(
    jobId: string
  ): Promise<{ status: "Success"; build: WebsiteBuildRecord } | { status: "Failed"; error: string }> {
    const POLL_INTERVAL_MS = 3000;
    const MAX_CONSECUTIVE_POLL_FAILURES = 10;
    let consecutiveFailures = 0;

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let json: { success: boolean; job?: WebsiteBuildJobRecord; build?: WebsiteBuildRecord | null; error?: string };
      try {
        const res = await fetch(`/api/design/website/jobs/${jobId}`);
        json = await res.json();
        consecutiveFailures = 0;
      } catch {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          return {
            status: "Failed",
            error: "네트워크 연결이 불안정해 진행 상태를 확인할 수 없습니다. 잠시 후 History에서 결과를 확인해주세요.",
          };
        }
        continue;
      }

      if (!json.success || !json.job) {
        return { status: "Failed", error: json.error ?? "Job 조회에 실패했습니다." };
      }
      if (json.job.status === "Success" && json.build) {
        return { status: "Success", build: json.build };
      }
      if (json.job.status === "Failed") {
        return { status: "Failed", error: json.job.error ?? "Website Builder 실행이 실패했습니다." };
      }
    }
  }

  const handleBuild = async () => {
    if (isBuilding || !selectedReviewId) return;
    setIsBuilding(true);
    setBuildError(null);

    try {
      const createRes = await fetch("/api/design/website/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: selectedReviewId, outDir: outDirInput.trim() || undefined }),
      });
      const createJson = (await createRes.json()) as { success: boolean; job?: WebsiteBuildJobRecord; error?: string };

      if (!createJson.success || !createJson.job) {
        setBuildError(createJson.error ?? "Build 요청 실패");
        return;
      }

      const jobId = createJson.job.id;
      fetch(`/api/design/website/jobs/${jobId}/run`, { method: "POST" }).catch(() => {});

      const result = await pollWebsiteBuildJob(jobId);
      if (result.status === "Failed") {
        setBuildError(result.error);
        return;
      }

      setBuilds((prev) => [result.build, ...prev.filter((b) => b.id !== result.build.id)]);
      setSelectedBuildId(result.build.id);

      // Website Builder가 생성한 결과(outDir 등)를 다시 불러온다.
      fetch("/api/websites")
        .then((r) => r.json())
        .then((j: WebsitesResponse) => setWebsites(j.websites ?? []))
        .catch(() => {});
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "요청 실패");
      load();
    } finally {
      setIsBuilding(false);
    }
  };

  /** History 목록의 "삭제" 버튼. app/developer/design/page.tsx의 handleDeletePlan()과 동일한 패턴. */
  async function handleDeleteBuild(build: WebsiteBuildRecord) {
    if (!window.confirm("이 Website Build 기록을 삭제할까요? 되돌릴 수 없습니다.")) {
      return;
    }

    setDeletingId(build.id);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/design/website/${build.id}`, { method: "DELETE" });
      const data: { success: boolean; error?: string } = await res.json();

      if (!data.success) {
        setDeleteError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      setBuilds((prev) => prev.filter((item) => item.id !== build.id));
      setSelectedBuildId((current) => (current === build.id ? null : current));
    } catch {
      setDeleteError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  // app/developer/inquiries/[id]/page.tsx의 handlePromoteWebsite()/handleSharePreview()와
  // 완전히 동일한 패턴 — 이 화면이 만드는 WebsiteRecord도 같은 /api/websites/[id] 엔드포인트를
  // 그대로 쓰므로 새 API를 만들지 않고 재사용한다.
  async function handlePromoteWebsite(websiteId: string) {
    setPromotingWebsiteId(websiteId);
    setPromoteError(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/promote`, { method: "POST" });
      const data: { success: boolean; error?: string } = await res.json();
      if (!data.success) {
        setPromoteError(data.error ?? "운영 배포 확정에 실패했습니다.");
        return;
      }
      load();
    } catch {
      setPromoteError("운영 배포 확정 중 오류가 발생했습니다.");
    } finally {
      setPromotingWebsiteId(null);
    }
  }

  async function handleSharePreview(websiteId: string) {
    setSharingWebsiteId(websiteId);
    setPreviewShareError(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/preview-share`, { method: "POST" });
      const data: { success: boolean; share?: WebsitePreviewShareRecord; error?: string } = await res.json();
      if (!data.success || !data.share) {
        setPreviewShareError(data.error ?? "공유 링크 생성에 실패했습니다.");
        return;
      }
      setPreviewShares((prev) => ({ ...prev, [websiteId]: data.share! }));
    } catch {
      setPreviewShareError("공유 링크 생성 중 오류가 발생했습니다.");
    } finally {
      setSharingWebsiteId(null);
    }
  }

  async function handleCopyPreviewShareLink(shareId: string) {
    const url = `${window.location.origin}/preview-review/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPreviewShareId(shareId);
      setTimeout(() => setCopiedPreviewShareId(null), 2000);
    } catch {
      // 클립보드 권한이 없는 환경 — 링크는 화면에 그대로 표시되어 있으므로 수동 복사 가능.
    }
  }

  const selectedBuild = builds.find((b) => b.id === selectedBuildId) ?? null;
  const selectedPlanForBuild = selectedBuild ? plans.find((p) => p.id === selectedBuild.planId) ?? null : null;
  const selectedWebsite = selectedBuild ? websites.find((w) => w.id === selectedBuild.websiteId) ?? null : null;

  const handleExportJson = () => {
    if (!selectedBuild) return;
    downloadBlob(JSON.stringify(selectedBuild, null, 2), `design-website-${selectedBuild.id}.json`, "application/json");
  };

  const handleExportMarkdown = () => {
    if (!selectedBuild) return;
    downloadBlob(
      toMarkdown(selectedPlanForBuild?.input.projectName ?? selectedBuild.reviewId, selectedBuild, selectedWebsite),
      `design-website-${selectedBuild.id}.md`,
      "text/markdown"
    );
  };

  return (
    <div>
      <DesignChainStepper />
      <PageHeader
        icon="🚀"
        title="Design — Website Builder"
        description="Design Automation Phase 9: 승인된 Design Plan을 기존 Website Builder v2(ai website create)로 그대로 연결합니다. 새 생성 엔진이 아니라 어댑터 계층입니다."
        actions={
          <Link href="/developer/design/sync" className="text-xs text-blue-400 hover:underline self-center">
            ← Design Sync
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Build Website">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Approved Review</label>
              <select
                value={selectedReviewId}
                onChange={(e) => setSelectedReviewId(e.target.value)}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                {approvedReviews.length === 0 && <option value="">승인된 Review가 없습니다</option>}
                {approvedReviews.map((review) => (
                  <option key={review.id} value={review.id}>
                    {reviewLabel(review.id)} — {new Date(review.updatedAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Output Directory (선택)</label>
              <input
                type="text"
                value={outDirInput}
                onChange={(e) => setOutDirInput(e.target.value)}
                placeholder="비워두면 .generated-websites/design-<slug>에 생성됩니다"
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>

            {buildError && <StatusMessage tone="error">{buildError}</StatusMessage>}

            <button
              onClick={handleBuild}
              disabled={isBuilding || !selectedReviewId}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isBuilding ? "Building..." : "Build with Website Builder"}
            </button>

            {isBuilding && (
              <p className="text-xs text-gray-500">
                여러 페이지의 콘텐츠 생성부터 저장소·배포까지 이어서 처리하는 중이라 최대 5분
                정도 걸릴 수 있습니다. 이 화면을 벗어나도 서버는 계속 처리되며, 이 화면으로
                돌아와 History에서 결과를 확인할 수 있습니다.
              </p>
            )}

            {approvedReviews.length === 0 && (
              <p className="text-xs text-gray-500">
                먼저{" "}
                <Link href="/developer/design/review" className="text-blue-400 hover:underline">
                  Review
                </Link>
                에서 디자인을 승인(Approve)하세요. Website Builder 연동은 Approved 상태에서만 가능합니다.
              </p>
            )}
          </div>
        </Card>

        <Card
          title="History"
          actions={
            <button onClick={load} className="text-xs text-blue-400 hover:underline">
              Refresh
            </button>
          }
        >
          {deleteError && (
            <StatusMessage tone="error" className="mb-2">
              {deleteError}
            </StatusMessage>
          )}
          {isLoading ? (
            <LoadingText />
          ) : loadError ? (
            <StatusMessage tone="error">{loadError}</StatusMessage>
          ) : builds.length === 0 ? (
            <p className="text-sm text-gray-500">아직 실행된 Build가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {builds.map((build) => (
                <li key={build.id} className="flex items-stretch gap-2">
                  <button
                    onClick={() => {
                      setSelectedBuildId(build.id);
                      // 이전 빌드 시도의 에러 메시지가 다른 항목을 선택한 뒤에도 그대로 남아
                      // 보이던 문제(2026-09-18 실사용 발견) — 선택이 바뀌면 지운다.
                      setBuildError(null);
                    }}
                    className={`flex-1 min-w-0 text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedBuildId === build.id
                        ? "bg-blue-600/20 border border-blue-600"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">
                        {reviewLabel(build.reviewId)} <span className="text-gray-500">v{build.version}</span>
                      </span>
                      <Badge tone={build.status === "Success" ? "success" : "danger"}>{build.status}</Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {build.siteType}
                      {build.simulatedContent ? " · simulated" : ""}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteBuild(build)}
                    disabled={deletingId === build.id}
                    className="shrink-0 self-center rounded bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {deletingId === build.id ? "삭제 중..." : "삭제"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selectedBuild && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Project">
              <p className="text-sm text-gray-300">{selectedPlanForBuild?.input.projectName ?? "—"}</p>
              <p className="text-xs text-gray-500">{selectedPlanForBuild?.input.projectType ?? "—"}</p>
            </Card>

            <Card title="Website Builder Result">
              <div className="flex items-center gap-2 mb-2">
                <Badge tone={selectedBuild.status === "Success" ? "success" : "danger"}>{selectedBuild.status}</Badge>
                {selectedBuild.simulatedContent && <Badge tone="warning">Simulated</Badge>}
                <span className="text-xs text-gray-500">{selectedBuild.siteType}</span>
              </div>
              {selectedWebsite && <p className="text-xs text-gray-400 font-mono break-all">{selectedWebsite.outDir}</p>}
              {selectedBuild.simulatedContent && selectedWebsite?.simulatedReason && (
                <p className="text-xs text-yellow-500 mt-1">Simulated 이유: {selectedWebsite.simulatedReason}</p>
              )}
              {selectedBuild.error && <p className="text-xs text-red-400 mt-1">{selectedBuild.error}</p>}

              {selectedWebsite && (
                <div className="mt-3 border-t border-gray-800 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={DEPLOYMENT_STATUS_TONES[selectedWebsite.deploymentStatus ?? "NotStarted"]}>
                      {DEPLOYMENT_STATUS_LABELS[selectedWebsite.deploymentStatus ?? "NotStarted"]}
                    </Badge>
                    {selectedWebsite.deployment?.url && (
                      <a
                        href={selectedWebsite.deployment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline"
                      >
                        {selectedWebsite.deploymentStatus === "Success" ? "운영 사이트 보기" : "미리보기 화면 확인"} →
                      </a>
                    )}
                  </div>
                  {selectedWebsite.deploymentStatus === "NotConfigured" && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      GITHUB_TOKEN·VERCEL_TOKEN이 설정되지 않아 실제 배포 없이 코드 생성까지만
                      완료됐습니다 — 이 상태로는 생성된 코드에 접근할 방법이 없습니다.
                    </p>
                  )}
                  {selectedWebsite.deploymentStatus === "Failed" && selectedWebsite.deploymentError && (
                    <p className="mt-1 text-[11px] text-red-400">{selectedWebsite.deploymentError}</p>
                  )}
                  {promoteError && <StatusMessage tone="error" className="mt-2">{promoteError}</StatusMessage>}
                  {previewShareError && <StatusMessage tone="error" className="mt-2">{previewShareError}</StatusMessage>}

                  {selectedWebsite.deploymentStatus === "PreviewReady" && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handlePromoteWebsite(selectedWebsite.id)}
                          disabled={promotingWebsiteId === selectedWebsite.id}
                          className="rounded bg-green-700 hover:bg-green-600 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {promotingWebsiteId === selectedWebsite.id ? "배포 확정 중..." : "미리보기 확인함 — 운영 배포 확정"}
                        </button>
                        <button
                          onClick={() => handleSharePreview(selectedWebsite.id)}
                          disabled={sharingWebsiteId === selectedWebsite.id}
                          className="rounded bg-purple-700 hover:bg-purple-600 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {sharingWebsiteId === selectedWebsite.id
                            ? "링크 생성 중..."
                            : previewShares[selectedWebsite.id]
                              ? "공유 링크 다시 보기"
                              : "의뢰자에게 실제 화면 공유"}
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        위 링크로 실제 화면을 먼저 확인하세요. 확정 전까지는 운영 도메인·고객 알림에 전혀 반영되지 않습니다.
                      </p>

                      {previewShares[selectedWebsite.id] && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-gray-800 bg-gray-950 px-2 py-2">
                          <code className="rounded bg-black px-2 py-1 text-[11px] text-blue-300">
                            {`${typeof window !== "undefined" ? window.location.origin : ""}/preview-review/${previewShares[selectedWebsite.id].id}`}
                          </code>
                          <button
                            onClick={() => handleCopyPreviewShareLink(previewShares[selectedWebsite.id].id)}
                            className="rounded bg-gray-700 hover:bg-gray-600 px-2 py-0.5 text-[11px] transition-colors"
                          >
                            {copiedPreviewShareId === previewShares[selectedWebsite.id].id ? "복사됨!" : "복사"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card title="Version History">
            <ol className="flex flex-col gap-2 text-sm text-gray-300">
              {selectedBuild.history
                .slice()
                .reverse()
                .map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 rounded border border-gray-800 p-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">v{entry.version}</span>
                        <Badge tone={entry.status === "Success" ? "success" : "danger"}>{entry.status}</Badge>
                        {entry.simulatedContent && <Badge tone="warning">Simulated</Badge>}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()} ({entry.actor ?? "system"})
                      </span>
                    </div>
                  </li>
                ))}
            </ol>
          </Card>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportJson}
              className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportMarkdown}
              className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
            >
              Export Markdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
