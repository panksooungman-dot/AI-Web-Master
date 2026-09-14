"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { DesignChainStepper } from "@/components/developer/design/DesignChainStepper";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { DesignPlanRecord } from "@/lib/design/types";
import type { StoryboardRecord } from "@/lib/design/storyboard";
import type { StoryboardShareRecord } from "@/lib/design/storyboard-share";
import type { StoryboardJobRecord } from "@/lib/design/storyboardJob";

interface PlansResponse {
  plans: DesignPlanRecord[];
}

interface StoryboardsResponse {
  storyboards: StoryboardRecord[];
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

function toMarkdown(plan: DesignPlanRecord, storyboard: StoryboardRecord): string {
  const lines: string[] = [];
  lines.push(`# Storyboard — ${plan.input.projectName}`);
  lines.push("");
  lines.push(`Generated: ${new Date(storyboard.createdAt).toLocaleString()}${storyboard.simulated ? " (simulated)" : ""}`);
  lines.push("");
  lines.push("## Site Map");
  for (const node of plan.content.siteMap) {
    lines.push(`- \`${node.path}\` ${node.title}`);
  }
  lines.push("");
  lines.push("## Screen List");
  for (const screen of plan.content.screenList) {
    lines.push(`- **${screen.name}** (\`${screen.path}\`) — ${screen.description}`);
  }
  lines.push("");
  lines.push("## Screen Flow");
  for (const node of storyboard.content.screenFlow) {
    lines.push(`- **${node.screen}** (\`${node.path}\`) — ${node.description}`);
  }
  lines.push("");
  lines.push("## Navigation Flow");
  for (const edge of storyboard.content.navigationFlow) {
    lines.push(`- ${edge.from} → ${edge.to} (${edge.trigger})`);
  }
  lines.push("");
  lines.push("## User Journeys");
  for (const journey of storyboard.content.userJourneys) {
    lines.push(`### ${journey.persona}`);
    lines.push(`Goal: ${journey.goal}`);
    for (const step of journey.steps) {
      lines.push(`${step.step}. ${step.screen} — ${step.goal}${step.emotion ? ` (${step.emotion})` : ""}`);
    }
    lines.push("");
  }
  lines.push("## Page Sequence");
  for (const item of storyboard.content.pageSequence) {
    lines.push(`${item.order}. ${item.screen} (\`${item.path}\`)`);
  }

  return lines.join("\n");
}

export default function StoryboardPage() {
  const [plans, setPlans] = useState<DesignPlanRecord[]>([]);
  const [storyboards, setStoryboards] = useState<StoryboardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [shares, setShares] = useState<Record<string, StoryboardShareRecord>>({});
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  // 페이지가 뷰포트보다 훨씬 길어 생성 직후에는 실제 결과(Screen Flow 등)가 한참 스크롤해야
  // 나온다는 혼동이 반복 확인되어(2026-09-11), 결과가 준비되면 그 지점으로 자동 스크롤한다.
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const scrollToResults = () => {
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/design/requirements").then((res) => res.json() as Promise<PlansResponse>),
      fetch("/api/design/storyboard").then((res) => res.json() as Promise<StoryboardsResponse>),
    ])
      .then(([plansJson, storyboardsJson]) => {
        const loadedPlans = plansJson.plans ?? [];
        const loadedStoryboards = storyboardsJson.storyboards ?? [];
        setPlans(loadedPlans);
        setStoryboards(loadedStoryboards);
        setSelectedPlanId((current) => current || loadedPlans[0]?.id || "");
        setSelectedStoryboardId((current) => current ?? loadedStoryboards[0]?.id ?? null);
      })
      .catch(() => setLoadError("Storyboard 데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  // "Website Build 연결(승인 후 실제 화면 생성)"(2026-09-14) — 관리자가 "공유" 버튼을 다시
  // 누르지 않아도, 의뢰자가 이미 승인/수정요청했다면 그 상태를 화면에 바로 보여줘야 "다음 단계
  // 시작" CTA가 뜬다. 아직 공유된 적 없는 Storyboard까지 공유 레코드를 만들지 않도록
  // 조회 전용 GET만 호출한다(이미 shares 캐시에 있으면 재조회하지 않음).
  useEffect(() => {
    if (!selectedStoryboardId || shares[selectedStoryboardId]) return;

    fetch(`/api/design/storyboard/${selectedStoryboardId}/share`)
      .then((res) => res.json() as Promise<{ share: StoryboardShareRecord | null }>)
      .then((json) => {
        if (json.share) {
          setShares((prev) => ({ ...prev, [selectedStoryboardId]: json.share! }));
        }
      })
      .catch(() => {
        // 조회 실패는 조용히 무시한다 — "공유" 버튼으로 언제든 다시 확인할 수 있다.
      });
  }, [selectedStoryboardId, shares]);

  // app/developer/design/page.tsx의 pollDesignPlanJob()과 동일한 패턴 — AI 생성이 최대
  // 270초까지 걸릴 수 있어 브라우저 fetch 하나를 그대로 붙잡는 대신, Job 생성 즉시 응답 →
  // 별도 실행(run)이 브라우저 쪽에서 끊겨도 서버는 계속 처리 → 짧은 간격 폴링으로 결과 회수
  // 구조로 바꿨다(2026-09-14 실사용 — Storyboard 생성이 "Generating..."에서 멈춤 재현).
  async function pollStoryboardJob(
    jobId: string
  ): Promise<{ status: "Success"; storyboard: StoryboardRecord } | { status: "Failed"; error: string }> {
    const POLL_INTERVAL_MS = 3000;
    const MAX_CONSECUTIVE_POLL_FAILURES = 10;
    let consecutiveFailures = 0;

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let json: { success: boolean; job?: StoryboardJobRecord; storyboard?: StoryboardRecord | null; error?: string };
      try {
        const res = await fetch(`/api/design/storyboard/jobs/${jobId}`);
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
      if (json.job.status === "Success" && json.storyboard) {
        return { status: "Success", storyboard: json.storyboard };
      }
      if (json.job.status === "Failed") {
        return { status: "Failed", error: json.job.error ?? "생성에 실패했습니다." };
      }
    }
  }

  const handleGenerate = async () => {
    if (isGenerating || !selectedPlanId) return;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const createRes = await fetch("/api/design/storyboard/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      const createJson = (await createRes.json()) as { success: boolean; job?: StoryboardJobRecord; error?: string };

      if (!createJson.success || !createJson.job) {
        setGenerateError(createJson.error ?? "생성 실패");
        return;
      }

      const jobId = createJson.job.id;
      fetch(`/api/design/storyboard/jobs/${jobId}/run`, { method: "POST" }).catch(() => {});

      const result = await pollStoryboardJob(jobId);
      if (result.status === "Failed") {
        setGenerateError(result.error);
        return;
      }

      setStoryboards((prev) => [result.storyboard, ...prev]);
      setSelectedStoryboardId(result.storyboard.id);
      scrollToResults();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsGenerating(false);
    }
  };

  /** History 목록의 "삭제" 버튼. app/developer/design/page.tsx의 handleDeletePlan()과 동일한 패턴. */
  async function handleDeleteStoryboard(storyboard: StoryboardRecord) {
    if (!window.confirm("이 Storyboard를 삭제할까요? 되돌릴 수 없습니다.")) {
      return;
    }

    setDeletingId(storyboard.id);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/design/storyboard/${storyboard.id}`, { method: "DELETE" });
      const data: { success: boolean; error?: string } = await res.json();

      if (!data.success) {
        setDeleteError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      setStoryboards((prev) => prev.filter((item) => item.id !== storyboard.id));
      setSelectedStoryboardId((current) => (current === storyboard.id ? null : current));
    } catch {
      setDeleteError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedStoryboard = storyboards.find((s) => s.id === selectedStoryboardId) ?? null;
  const linkedPlan = selectedStoryboard ? plans.find((p) => p.id === selectedStoryboard.planId) ?? null : null;

  const handleExportJson = () => {
    if (!selectedStoryboard) return;
    downloadBlob(JSON.stringify(selectedStoryboard, null, 2), `storyboard-${selectedStoryboard.id}.json`, "application/json");
  };

  const handleExportMarkdown = () => {
    if (!selectedStoryboard || !linkedPlan) return;
    downloadBlob(toMarkdown(linkedPlan, selectedStoryboard), `storyboard-${selectedStoryboard.id}.md`, "text/markdown");
  };

  // "디자인쪽에서 수정할 게 있으면 실제 화면으로 봐야지 개발을 하는 거 아냐" — 개발 착수 전
  // 의뢰자가 화면 구성을 직접 확인·승인/수정요청할 수 있는 공개 링크를 만든다.
  const handleShare = async () => {
    if (!selectedStoryboard || isSharing) return;
    setIsSharing(true);
    setShareError(null);

    try {
      const res = await fetch(`/api/design/storyboard/${selectedStoryboard.id}/share`, { method: "POST" });
      const json: { success: boolean; share?: StoryboardShareRecord; error?: string } = await res.json();
      if (!json.success || !json.share) {
        setShareError(json.error ?? "공유 링크 생성에 실패했습니다.");
        return;
      }
      setShares((prev) => ({ ...prev, [selectedStoryboard.id]: json.share! }));
    } catch {
      setShareError("공유 링크 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyShareLink = async (shareId: string) => {
    const url = `${window.location.origin}/design-review/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShareId(shareId);
      setTimeout(() => setCopiedShareId(null), 2000);
    } catch {
      // 클립보드 권한이 없는 환경 — 링크는 화면에 그대로 표시되어 있으므로 수동 복사 가능.
    }
  };

  const activeShare = selectedStoryboard ? shares[selectedStoryboard.id] : undefined;

  return (
    <div>
      <DesignChainStepper />
      <PageHeader
        icon="🎬"
        title="Design — Storyboard"
        description="Design Automation Phase 2: Screen Flow·User Journey·Navigation Flow·Page Sequence·Screen Description을 Phase 1 Design Plan 위에서 생성합니다."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/developer/design" className="text-xs text-blue-400 hover:underline">
              ← Requirements
            </Link>
            <Link href="/developer/design/wireframe" className="text-xs text-blue-400 hover:underline">
              Wireframe →
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Generate Storyboard">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Design Plan</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                {plans.length === 0 && <option value="">Design Plan이 없습니다</option>}
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.input.projectName}
                  </option>
                ))}
              </select>
            </div>

            {generateError && <StatusMessage tone="error">{generateError}</StatusMessage>}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedPlanId}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Storyboard"}
            </button>

            {plans.length === 0 && (
              <p className="text-xs text-gray-500">
                먼저 <Link href="/developer/design" className="text-blue-400 hover:underline">Requirements</Link>에서
                Design Plan을 생성하세요.
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
          ) : storyboards.length === 0 ? (
            <p className="text-sm text-gray-500">아직 생성된 Storyboard가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {storyboards.map((sb) => {
                const plan = plans.find((p) => p.id === sb.planId);
                return (
                  <li key={sb.id} className="flex items-stretch gap-2">
                    <button
                      onClick={() => {
                        setSelectedStoryboardId(sb.id);
                        scrollToResults();
                      }}
                      className={`flex-1 min-w-0 text-left rounded px-3 py-2 text-sm transition-colors ${
                        selectedStoryboardId === sb.id
                          ? "bg-blue-600/20 border border-blue-600"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">{plan?.input.projectName ?? sb.planId}</span>
                        {sb.simulated && <Badge tone="warning">Simulated</Badge>}
                      </div>
                      <span className="text-xs text-gray-500">{new Date(sb.createdAt).toLocaleString()}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteStoryboard(sb)}
                      disabled={deletingId === sb.id}
                      className="shrink-0 self-center rounded bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {deletingId === sb.id ? "삭제 중..." : "삭제"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {selectedStoryboard && linkedPlan && (
        <>
          <div ref={resultsRef} className="flex flex-wrap gap-2 mb-6">
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
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="rounded bg-purple-700 hover:bg-purple-600 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSharing ? "링크 생성 중..." : activeShare ? "공유 링크 다시 보기" : "의뢰자에게 공유"}
            </button>
          </div>

          {shareError && <StatusMessage tone="error" className="mb-6">{shareError}</StatusMessage>}

          {activeShare && (
            <Card title="의뢰자 공유 링크" className="mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-gray-950 px-2 py-1 text-xs text-blue-300">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/design-review/${activeShare.id}`}
                </code>
                <button
                  onClick={() => handleCopyShareLink(activeShare.id)}
                  className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1 text-xs transition-colors"
                >
                  {copiedShareId === activeShare.id ? "복사됨!" : "복사"}
                </button>
                <Badge
                  tone={
                    activeShare.status === "approved"
                      ? "success"
                      : activeShare.status === "revision_requested"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {activeShare.status === "approved"
                    ? "승인됨"
                    : activeShare.status === "revision_requested"
                      ? "수정 요청됨"
                      : "응답 대기 중"}
                </Badge>
              </div>
              {activeShare.comment && (
                <p className="mt-2 text-xs text-gray-400">의뢰자 의견: &ldquo;{activeShare.comment}&rdquo;</p>
              )}
              {activeShare.status === "approved" && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded border border-emerald-700 bg-emerald-900/20 p-3">
                  <p className="text-sm text-emerald-300">
                    ✅ 의뢰자가 승인했습니다 — 이제 실제 화면 생성을 이어서 진행할 수 있습니다.
                  </p>
                  <Link
                    href={`/developer/design/wireframe?storyboardId=${selectedStoryboard.id}`}
                    className="rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
                  >
                    Wireframe부터 이어서 진행 →
                  </Link>
                </div>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Project">
              <p className="text-sm text-gray-300">{linkedPlan.input.projectName}</p>
              <p className="text-xs text-gray-500">{linkedPlan.content.requirementAnalysis.projectSummary}</p>
            </Card>

            <Card title="Site Map">
              <ul className="flex flex-col gap-1 text-sm">
                {linkedPlan.content.siteMap.map((node, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs text-gray-500">{node.path}</span>{" "}
                    <span className="text-gray-200">{node.title}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Screen List" className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedPlan.content.screenList.map((screen, i) => (
                  <div key={i} className="rounded border border-gray-800 p-3">
                    <p className="text-sm font-semibold text-gray-200">{screen.name}</p>
                    <p className="font-mono text-xs text-gray-500">{screen.path}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Screen Flow">
              <ul className="flex flex-col gap-1 text-sm">
                {selectedStoryboard.content.screenFlow.map((node, i) => (
                  <li key={i}>
                    <span className="font-semibold text-gray-200">{node.screen}</span>{" "}
                    <span className="text-xs text-gray-500">({node.path})</span> — {node.description}
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Navigation Flow">
              <ul className="flex flex-col gap-1 text-sm text-gray-300">
                {selectedStoryboard.content.navigationFlow.map((edge, i) => (
                  <li key={i}>
                    {edge.from} → {edge.to} <span className="text-xs text-gray-500">({edge.trigger})</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="User Journey" className="lg:col-span-2">
              {selectedStoryboard.content.userJourneys.map((journey, i) => (
                <div key={i} className="mb-3">
                  <p className="text-sm font-semibold text-gray-200">
                    {journey.persona} — <span className="font-normal text-gray-400">{journey.goal}</span>
                  </p>
                  <ol className="text-xs text-gray-400 flex flex-col gap-1 mt-1">
                    {journey.steps.map((step) => (
                      <li key={step.step}>
                        {step.step}. {step.screen} — {step.goal}
                        {step.emotion && ` (${step.emotion})`}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
