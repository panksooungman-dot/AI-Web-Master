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
import type { PrototypeRecord } from "@/lib/design/prototype";

interface PlansResponse {
  plans: DesignPlanRecord[];
}

interface StoryboardsResponse {
  storyboards: StoryboardRecord[];
}

interface WireframesResponse {
  wireframes: WireframeRecord[];
}

interface PrototypesResponse {
  prototypes: PrototypeRecord[];
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

function toMarkdown(projectName: string, prototype: PrototypeRecord): string {
  const lines: string[] = [];
  lines.push(`# Prototype — ${projectName} (v${prototype.version})`);
  lines.push("");
  lines.push(
    `Generated: ${new Date(prototype.createdAt).toLocaleString()}${prototype.simulated ? " (simulated)" : ""}`
  );
  lines.push("");

  lines.push("## Preview");
  const preview = prototype.content.preview;
  lines.push(`- Start Screen: ${preview.startScreen}`);
  lines.push(`- Total Screens: ${preview.totalScreens}`);
  lines.push(`- Total Interactions: ${preview.totalInteractions}`);
  lines.push(`- ${preview.summary}`);
  lines.push("");

  lines.push("## Click Flow");
  for (const flow of prototype.content.clickFlows) {
    lines.push(`### ${flow.name}`);
    for (const step of flow.steps) {
      lines.push(`${step.step}. ${step.screen} — ${step.element} (${step.action}) → ${step.leadsTo}`);
    }
  }
  lines.push("");

  lines.push("## Navigation Flow");
  for (const edge of prototype.content.navigationFlow) {
    lines.push(`- ${edge.from} → ${edge.to} (${edge.trigger})`);
  }
  lines.push("");

  lines.push("## Screen Transitions");
  for (const transition of prototype.content.screenTransitions) {
    lines.push(`- ${transition.from} → ${transition.to}: ${transition.type} (${transition.durationMs}ms)`);
  }
  lines.push("");

  lines.push("## Interaction Map");
  for (const map of prototype.content.interactionMap) {
    lines.push(`### ${map.screen}`);
    for (const interaction of map.interactions) {
      lines.push(`- ${interaction.element} (${interaction.trigger}) — ${interaction.result}`);
    }
  }
  lines.push("");

  lines.push("## Component Actions");
  for (const action of prototype.content.componentActions) {
    lines.push(`- **${action.component}** — ${action.action}: ${action.description}`);
  }
  lines.push("");

  lines.push("## User Journey");
  for (const journey of prototype.content.userJourneys) {
    lines.push(`### ${journey.persona}`);
    lines.push(`Goal: ${journey.goal}`);
    for (const step of journey.steps) {
      lines.push(`${step.step}. ${step.screen} — ${step.action}${step.emotion ? ` (${step.emotion})` : ""}`);
    }
  }
  lines.push("");

  lines.push("## Animation Previews");
  for (const anim of prototype.content.animationPreviews) {
    lines.push(`- ${anim.screen}: ${anim.animation} (${anim.trigger}, ${anim.durationMs}ms)`);
  }

  return lines.join("\n");
}

export default function PrototypePage() {
  const [plans, setPlans] = useState<DesignPlanRecord[]>([]);
  const [storyboards, setStoryboards] = useState<StoryboardRecord[]>([]);
  const [wireframes, setWireframes] = useState<WireframeRecord[]>([]);
  const [prototypes, setPrototypes] = useState<PrototypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedWireframeId, setSelectedWireframeId] = useState<string>("");
  const [selectedPrototypeId, setSelectedPrototypeId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/design/requirements").then((res) => res.json() as Promise<PlansResponse>),
      fetch("/api/design/storyboard").then((res) => res.json() as Promise<StoryboardsResponse>),
      fetch("/api/design/wireframe").then((res) => res.json() as Promise<WireframesResponse>),
      fetch("/api/design/prototype").then((res) => res.json() as Promise<PrototypesResponse>),
    ])
      .then(([plansJson, storyboardsJson, wireframesJson, prototypesJson]) => {
        const loadedPlans = plansJson.plans ?? [];
        const loadedStoryboards = storyboardsJson.storyboards ?? [];
        const loadedWireframes = wireframesJson.wireframes ?? [];
        const loadedPrototypes = prototypesJson.prototypes ?? [];
        setPlans(loadedPlans);
        setStoryboards(loadedStoryboards);
        setWireframes(loadedWireframes);
        setPrototypes(loadedPrototypes);
        setSelectedWireframeId((current) => current || loadedWireframes[0]?.id || "");
        setSelectedPrototypeId((current) => current ?? loadedPrototypes[0]?.id ?? null);
      })
      .catch(() => setLoadError("Prototype 데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const handleGenerate = async () => {
    if (isGenerating || !selectedWireframeId) return;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/design/prototype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wireframeId: selectedWireframeId }),
      });
      const json = (await res.json()) as { success: boolean; prototype?: PrototypeRecord; error?: string };

      if (!json.success || !json.prototype) {
        setGenerateError(json.error ?? "생성 실패");
        return;
      }

      setPrototypes((prev) => [json.prototype!, ...prev]);
      setSelectedPrototypeId(json.prototype.id);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsGenerating(false);
    }
  };

  const storyboardForWireframe = (wireframeId: string): StoryboardRecord | null =>
    storyboards.find((s) => s.id === wireframes.find((w) => w.id === wireframeId)?.storyboardId) ?? null;

  const planForWireframe = (wireframeId: string): DesignPlanRecord | null =>
    plans.find((p) => p.id === storyboardForWireframe(wireframeId)?.planId) ?? null;

  const wireframeLabel = (wireframeId: string): string =>
    planForWireframe(wireframeId)?.input.projectName ?? wireframeId;

  const selectedPrototype = prototypes.find((p) => p.id === selectedPrototypeId) ?? null;
  const selectedWireframe = selectedPrototype
    ? wireframes.find((w) => w.id === selectedPrototype.wireframeId) ?? null
    : null;
  const selectedStoryboard = selectedWireframe ? storyboardForWireframe(selectedWireframe.id) : null;
  const selectedPlan = selectedWireframe ? planForWireframe(selectedWireframe.id) : null;

  const handleExportJson = () => {
    if (!selectedPrototype) return;
    downloadBlob(JSON.stringify(selectedPrototype, null, 2), `prototype-${selectedPrototype.id}.json`, "application/json");
  };

  const handleExportMarkdown = () => {
    if (!selectedPrototype) return;
    downloadBlob(
      toMarkdown(selectedPlan?.input.projectName ?? selectedPrototype.wireframeId, selectedPrototype),
      `prototype-${selectedPrototype.id}.md`,
      "text/markdown"
    );
  };

  return (
    <div>
      <PageHeader
        icon="🕹️"
        title="Design — Prototype"
        description="Design Automation Phase 4: Click Flow·Navigation Flow·Screen Transition·Interaction Map·Component Actions·User Journey·Animation Preview·Prototype Preview를 Phase 3 Wireframe 위에서 생성합니다."
        actions={
          <Link href="/developer/design/wireframe" className="text-xs text-blue-400 hover:underline self-center">
            ← Wireframe
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Generate Prototype">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Wireframe</label>
              <select
                value={selectedWireframeId}
                onChange={(e) => setSelectedWireframeId(e.target.value)}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                {wireframes.length === 0 && <option value="">Wireframe이 없습니다</option>}
                {wireframes.map((wf) => (
                  <option key={wf.id} value={wf.id}>
                    {wireframeLabel(wf.id)} — {new Date(wf.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {generateError && <StatusMessage tone="error">{generateError}</StatusMessage>}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedWireframeId}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Prototype"}
            </button>

            {wireframes.length === 0 && (
              <p className="text-xs text-gray-500">
                먼저 <Link href="/developer/design/wireframe" className="text-blue-400 hover:underline">Wireframe</Link>을
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
          ) : prototypes.length === 0 ? (
            <p className="text-sm text-gray-500">아직 생성된 Prototype이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {prototypes.map((proto) => (
                <li key={proto.id}>
                  <button
                    onClick={() => setSelectedPrototypeId(proto.id)}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedPrototypeId === proto.id
                        ? "bg-blue-600/20 border border-blue-600"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">
                        {wireframeLabel(proto.wireframeId)} <span className="text-gray-500">v{proto.version}</span>
                      </span>
                      {proto.simulated && <Badge tone="warning">Simulated</Badge>}
                    </div>
                    <span className="text-xs text-gray-500">{new Date(proto.createdAt).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selectedPrototype && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Project">
              <p className="text-sm text-gray-300">{selectedPlan?.input.projectName ?? "—"}</p>
              <p className="text-xs text-gray-500">{selectedPlan?.content.requirementAnalysis.projectSummary}</p>
            </Card>

            <Card title="Storyboard">
              {selectedStoryboard ? (
                <>
                  <p className="text-sm text-gray-300">{selectedStoryboard.content.screenFlow.length}개 화면 흐름</p>
                  <p className="text-xs text-gray-500">{new Date(selectedStoryboard.createdAt).toLocaleString()}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </Card>

            <Card title="Wireframe">
              {selectedWireframe ? (
                <>
                  <p className="text-sm text-gray-300">{selectedWireframe.content.layouts.length}개 화면 레이아웃</p>
                  <p className="text-xs text-gray-500">{new Date(selectedWireframe.createdAt).toLocaleString()}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </Card>
          </div>

          <Card title="Prototype Preview">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Start Screen</p>
                <p className="text-gray-200 font-semibold">{selectedPrototype.content.preview.startScreen}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Screens</p>
                <p className="text-gray-200 font-semibold">{selectedPrototype.content.preview.totalScreens}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Interactions</p>
                <p className="text-gray-200 font-semibold">{selectedPrototype.content.preview.totalInteractions}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Version</p>
                <p className="text-gray-200 font-semibold">v{selectedPrototype.version}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">{selectedPrototype.content.preview.summary}</p>

            {selectedPrototype.content.clickFlows.map((flow, i) => (
              <div key={i} className="mt-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">{flow.name}</p>
                <ol className="text-xs text-gray-400 flex flex-col gap-1">
                  {flow.steps.map((step) => (
                    <li key={step.step}>
                      {step.step}. {step.screen} — {step.element} ({step.action}) → {step.leadsTo}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </Card>

          <Card title="Interaction Flow">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedPrototype.content.interactionMap.map((map, i) => (
                <div key={i} className="rounded border border-gray-800 p-3">
                  <p className="text-sm font-semibold text-gray-200 mb-1">{map.screen}</p>
                  <ul className="flex flex-col gap-1 text-xs text-gray-400">
                    {map.interactions.map((interaction, j) => (
                      <li key={j}>
                        <span className="text-gray-200">{interaction.element}</span> ({interaction.trigger}) —{" "}
                        {interaction.result}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-gray-500 mt-4 mb-1">Component Actions</p>
            <div className="flex flex-wrap gap-2">
              {selectedPrototype.content.componentActions.map((action, i) => (
                <Badge key={i} tone="accent">
                  {action.component}: {action.action}
                </Badge>
              ))}
            </div>
          </Card>

          <Card title="Screen Transition">
            <ul className="flex flex-col gap-1 text-sm text-gray-300">
              {selectedPrototype.content.screenTransitions.map((transition, i) => (
                <li key={i}>
                  {transition.from} → {transition.to}{" "}
                  <span className="text-xs text-gray-500">
                    ({transition.type}, {transition.durationMs}ms)
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Journey">
            {selectedPrototype.content.userJourneys.map((journey, i) => (
              <div key={i} className="mb-3">
                <p className="text-sm font-semibold text-gray-200">
                  {journey.persona} — <span className="font-normal text-gray-400">{journey.goal}</span>
                </p>
                <ol className="text-xs text-gray-400 flex flex-col gap-1 mt-1">
                  {journey.steps.map((step) => (
                    <li key={step.step}>
                      {step.step}. {step.screen} — {step.action}
                      {step.emotion && ` (${step.emotion})`}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
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
