"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { DesignPlanRecord } from "@/lib/design/types";
import type { ReviewRecord } from "@/lib/design/review";
import type { WebsiteBuildRecord } from "@/lib/design/website-build";
import type { WebsiteRecord } from "@/lib/websites/registry";

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

  const handleBuild = async () => {
    if (isBuilding || !selectedReviewId) return;
    setIsBuilding(true);
    setBuildError(null);

    try {
      const res = await fetch("/api/design/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: selectedReviewId, outDir: outDirInput.trim() || undefined }),
      });
      const json = (await res.json()) as { success: boolean; build?: WebsiteBuildRecord; error?: string };

      if (!json.build) {
        setBuildError(json.error ?? "Build 요청 실패");
        return;
      }

      setBuilds((prev) => [json.build!, ...prev.filter((b) => b.id !== json.build!.id)]);
      setSelectedBuildId(json.build.id);

      if (!json.success) {
        setBuildError(json.error ?? "Website Builder 실행이 실패했습니다.");
      }

      // Website Builder가 생성한 결과(outDir 등)를 다시 불러온다.
      fetch("/api/websites")
        .then((r) => r.json())
        .then((j: WebsitesResponse) => setWebsites(j.websites ?? []))
        .catch(() => {});
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsBuilding(false);
    }
  };

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
          {isLoading ? (
            <LoadingText />
          ) : loadError ? (
            <StatusMessage tone="error">{loadError}</StatusMessage>
          ) : builds.length === 0 ? (
            <p className="text-sm text-gray-500">아직 실행된 Build가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {builds.map((build) => (
                <li key={build.id}>
                  <button
                    onClick={() => setSelectedBuildId(build.id)}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
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
              {selectedBuild.error && <p className="text-xs text-red-400 mt-1">{selectedBuild.error}</p>}
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
