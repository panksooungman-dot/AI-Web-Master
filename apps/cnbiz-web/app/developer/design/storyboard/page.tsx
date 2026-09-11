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

  const handleGenerate = async () => {
    if (isGenerating || !selectedPlanId) return;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/design/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      const json = (await res.json()) as { success: boolean; storyboard?: StoryboardRecord; error?: string };

      if (!json.success || !json.storyboard) {
        setGenerateError(json.error ?? "생성 실패");
        return;
      }

      setStoryboards((prev) => [json.storyboard!, ...prev]);
      setSelectedStoryboardId(json.storyboard.id);
      scrollToResults();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsGenerating(false);
    }
  };

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
                  <li key={sb.id}>
                    <button
                      onClick={() => {
                        setSelectedStoryboardId(sb.id);
                        scrollToResults();
                      }}
                      className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
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
