"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { DesignPlanRecord } from "@/lib/design/types";
import type { StoryboardRecord } from "@/lib/design/storyboard";
import type { WireframeRecord } from "@/lib/design/wireframe";

interface PlansResponse {
  plans: DesignPlanRecord[];
}

interface StoryboardsResponse {
  storyboards: StoryboardRecord[];
}

interface WireframesResponse {
  wireframes: WireframeRecord[];
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

function toMarkdown(projectName: string, wireframe: WireframeRecord): string {
  const lines: string[] = [];
  lines.push(`# Wireframe — ${projectName}`);
  lines.push("");
  lines.push(
    `Generated: ${new Date(wireframe.createdAt).toLocaleString()}${wireframe.simulated ? " (simulated)" : ""}`
  );
  lines.push("");

  for (const layout of wireframe.content.layouts) {
    lines.push(`## ${layout.screen} (\`${layout.path}\`)`);
    for (const bp of [layout.desktop, layout.tablet, layout.mobile]) {
      lines.push(`### ${bp.breakpoint} (columns: ${bp.columns})`);
      for (const section of bp.sections) {
        lines.push(`- **${section.name}** [${section.components.join(", ")}] — ${section.description}`);
      }
    }
    lines.push("");
  }

  lines.push("## Components");
  for (const component of wireframe.content.components) {
    lines.push(`- **${component.type}** — ${component.notes} (used in: ${component.usedIn.join(", ")})`);
  }
  lines.push("");

  lines.push("## Responsive");
  for (const behavior of [wireframe.content.responsive.desktop, wireframe.content.responsive.tablet, wireframe.content.responsive.mobile]) {
    lines.push(`- **${behavior.breakpoint}** (min-width: ${behavior.minWidth}px, columns: ${behavior.columns}) — ${behavior.notes}`);
  }

  return lines.join("\n");
}

export default function WireframePage() {
  const [plans, setPlans] = useState<DesignPlanRecord[]>([]);
  const [storyboards, setStoryboards] = useState<StoryboardRecord[]>([]);
  const [wireframes, setWireframes] = useState<WireframeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string>("");
  const [selectedWireframeId, setSelectedWireframeId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/design/requirements").then((res) => res.json() as Promise<PlansResponse>),
      fetch("/api/design/storyboard").then((res) => res.json() as Promise<StoryboardsResponse>),
      fetch("/api/design/wireframe").then((res) => res.json() as Promise<WireframesResponse>),
    ])
      .then(([plansJson, storyboardsJson, wireframesJson]) => {
        const loadedPlans = plansJson.plans ?? [];
        const loadedStoryboards = storyboardsJson.storyboards ?? [];
        const loadedWireframes = wireframesJson.wireframes ?? [];
        setPlans(loadedPlans);
        setStoryboards(loadedStoryboards);
        setWireframes(loadedWireframes);
        setSelectedStoryboardId((current) => current || loadedStoryboards[0]?.id || "");
        setSelectedWireframeId((current) => current ?? loadedWireframes[0]?.id ?? null);
      })
      .catch(() => setLoadError("Wireframe 데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const handleGenerate = async () => {
    if (isGenerating || !selectedStoryboardId) return;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/design/wireframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyboardId: selectedStoryboardId }),
      });
      const json = (await res.json()) as { success: boolean; wireframe?: WireframeRecord; error?: string };

      if (!json.success || !json.wireframe) {
        setGenerateError(json.error ?? "생성 실패");
        return;
      }

      setWireframes((prev) => [json.wireframe!, ...prev]);
      setSelectedWireframeId(json.wireframe.id);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsGenerating(false);
    }
  };

  const projectNameForStoryboard = (storyboardId: string): string =>
    plans.find((p) => p.id === storyboards.find((s) => s.id === storyboardId)?.planId)?.input.projectName ??
    storyboardId;

  const selectedWireframe = wireframes.find((w) => w.id === selectedWireframeId) ?? null;
  const projectName = selectedWireframe ? projectNameForStoryboard(selectedWireframe.storyboardId) : "";

  const handleExportJson = () => {
    if (!selectedWireframe) return;
    downloadBlob(JSON.stringify(selectedWireframe, null, 2), `wireframe-${selectedWireframe.id}.json`, "application/json");
  };

  const handleExportMarkdown = () => {
    if (!selectedWireframe) return;
    downloadBlob(toMarkdown(projectName, selectedWireframe), `wireframe-${selectedWireframe.id}.md`, "text/markdown");
  };

  return (
    <div>
      <PageHeader
        icon="🧱"
        title="Design — Wireframe"
        description="Design Automation Phase 3: Desktop·Tablet·Mobile Layout·Component Layout·Responsive Layout·Screen Sections을 Phase 2 Storyboard 위에서 생성합니다."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/developer/design/storyboard" className="text-xs text-blue-400 hover:underline">
              ← Storyboard
            </Link>
            <Link href="/developer/design/prototype" className="text-xs text-blue-400 hover:underline">
              Prototype →
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Generate Wireframe">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Storyboard</label>
              <select
                value={selectedStoryboardId}
                onChange={(e) => setSelectedStoryboardId(e.target.value)}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                {storyboards.length === 0 && <option value="">Storyboard가 없습니다</option>}
                {storyboards.map((sb) => (
                  <option key={sb.id} value={sb.id}>
                    {projectNameForStoryboard(sb.id)} — {new Date(sb.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {generateError && <StatusMessage tone="error">{generateError}</StatusMessage>}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedStoryboardId}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Wireframe"}
            </button>

            {storyboards.length === 0 && (
              <p className="text-xs text-gray-500">
                먼저 <Link href="/developer/design/storyboard" className="text-blue-400 hover:underline">Storyboard</Link>를
                생성하세요.
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
          ) : wireframes.length === 0 ? (
            <p className="text-sm text-gray-500">아직 생성된 Wireframe이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {wireframes.map((wf) => (
                <li key={wf.id}>
                  <button
                    onClick={() => setSelectedWireframeId(wf.id)}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedWireframeId === wf.id
                        ? "bg-blue-600/20 border border-blue-600"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{projectNameForStoryboard(wf.storyboardId)}</span>
                      {wf.simulated && <Badge tone="warning">Simulated</Badge>}
                    </div>
                    <span className="text-xs text-gray-500">{new Date(wf.createdAt).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selectedWireframe && (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card title="Project">
              <p className="text-sm text-gray-300">{projectName}</p>
            </Card>

            <Card title="Responsive Layout">
              <ul className="flex flex-col gap-1 text-sm text-gray-300">
                {[selectedWireframe.content.responsive.desktop, selectedWireframe.content.responsive.tablet, selectedWireframe.content.responsive.mobile].map(
                  (behavior) => (
                    <li key={behavior.breakpoint}>
                      <span className="font-semibold text-gray-200 capitalize">{behavior.breakpoint}</span>{" "}
                      <span className="text-xs text-gray-500">
                        (min-width: {behavior.minWidth}px, {behavior.columns} columns)
                      </span>{" "}
                      — {behavior.notes}
                    </li>
                  )
                )}
              </ul>
            </Card>

            <Card title="Component Layout" className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedWireframe.content.components.map((component, i) => (
                  <div key={i} className="rounded border border-gray-800 p-3">
                    <p className="text-sm font-semibold text-gray-200">{component.type}</p>
                    <p className="text-xs text-gray-400 mb-2">{component.notes}</p>
                    <div className="flex flex-wrap gap-1">
                      {component.usedIn.map((screen) => (
                        <Badge key={screen} tone="accent">
                          {screen}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            {selectedWireframe.content.layouts.map((layout, i) => (
              <Card key={i} title={`${layout.screen} (${layout.path})`}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[layout.desktop, layout.tablet, layout.mobile].map((bp) => (
                    <div key={bp.breakpoint} className="rounded border border-gray-800 p-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                        {bp.breakpoint} · {bp.columns} columns
                      </p>
                      <ul className="flex flex-col gap-1.5 text-xs text-gray-300">
                        {bp.sections.map((section, j) => (
                          <li key={j}>
                            <span className="font-semibold text-gray-200">{section.name}</span>{" "}
                            <span className="text-gray-500">[{section.components.join(", ")}]</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
