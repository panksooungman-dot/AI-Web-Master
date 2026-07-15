"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { DesignPlanRecord } from "@/lib/design/types";
import type { WireframeRecord } from "@/lib/design/wireframe";
import type { PrototypeRecord } from "@/lib/design/prototype";
import type { ClaudeDesignRecord } from "@/lib/design/claude-design";

interface PlansResponse {
  plans: DesignPlanRecord[];
}

interface WireframesResponse {
  wireframes: WireframeRecord[];
}

interface PrototypesResponse {
  prototypes: PrototypeRecord[];
}

interface ClaudeDesignsResponse {
  claudeDesigns: ClaudeDesignRecord[];
}

const PROMPT_SECTIONS: { key: keyof ClaudeDesignRecord["content"]; title: string }[] = [
  { key: "designPrompt", title: "Design Prompt" },
  { key: "uiPrompt", title: "UI Prompt" },
  { key: "componentPrompt", title: "Component Prompt" },
  { key: "themePrompt", title: "Theme Prompt" },
  { key: "layoutPrompt", title: "Layout Prompt" },
];

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(projectName: string, claudeDesign: ClaudeDesignRecord): string {
  const lines: string[] = [];
  lines.push(`# Claude Design Prompts — ${projectName}`);
  lines.push("");
  lines.push(
    `Generated: ${new Date(claudeDesign.createdAt).toLocaleString()}${claudeDesign.simulated ? " (simulated)" : ""}`
  );
  lines.push("");

  for (const section of PROMPT_SECTIONS) {
    lines.push(`## ${section.title}`);
    lines.push("");
    lines.push(claudeDesign.content[section.key]);
    lines.push("");
  }

  return lines.join("\n");
}

export default function ClaudeDesignPage() {
  const [plans, setPlans] = useState<DesignPlanRecord[]>([]);
  const [wireframes, setWireframes] = useState<WireframeRecord[]>([]);
  const [prototypes, setPrototypes] = useState<PrototypeRecord[]>([]);
  const [claudeDesigns, setClaudeDesigns] = useState<ClaudeDesignRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPrototypeId, setSelectedPrototypeId] = useState<string>("");
  const [selectedClaudeDesignId, setSelectedClaudeDesignId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/design/requirements").then((res) => res.json() as Promise<PlansResponse>),
      fetch("/api/design/wireframe").then((res) => res.json() as Promise<WireframesResponse>),
      fetch("/api/design/prototype").then((res) => res.json() as Promise<PrototypesResponse>),
      fetch("/api/design/claude").then((res) => res.json() as Promise<ClaudeDesignsResponse>),
    ])
      .then(([plansJson, wireframesJson, prototypesJson, claudeDesignsJson]) => {
        const loadedPlans = plansJson.plans ?? [];
        const loadedWireframes = wireframesJson.wireframes ?? [];
        const loadedPrototypes = prototypesJson.prototypes ?? [];
        const loadedClaudeDesigns = claudeDesignsJson.claudeDesigns ?? [];
        setPlans(loadedPlans);
        setWireframes(loadedWireframes);
        setPrototypes(loadedPrototypes);
        setClaudeDesigns(loadedClaudeDesigns);
        setSelectedPrototypeId((current) => current || loadedPrototypes[0]?.id || "");
        setSelectedClaudeDesignId((current) => current ?? loadedClaudeDesigns[0]?.id ?? null);
      })
      .catch(() => setLoadError("Claude Design 데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const handleGenerate = async () => {
    if (isGenerating || !selectedPrototypeId) return;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/design/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prototypeId: selectedPrototypeId }),
      });
      const json = (await res.json()) as { success: boolean; claudeDesign?: ClaudeDesignRecord; error?: string };

      if (!json.success || !json.claudeDesign) {
        setGenerateError(json.error ?? "생성 실패");
        return;
      }

      setClaudeDesigns((prev) => [json.claudeDesign!, ...prev]);
      setSelectedClaudeDesignId(json.claudeDesign.id);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsGenerating(false);
    }
  };

  const wireframeForPrototype = (prototypeId: string): WireframeRecord | null =>
    wireframes.find((w) => w.id === prototypes.find((p) => p.id === prototypeId)?.wireframeId) ?? null;

  const planForPrototype = (prototypeId: string): DesignPlanRecord | null =>
    plans.find((p) => p.id === wireframeForPrototype(prototypeId)?.planId) ?? null;

  const prototypeLabel = (prototypeId: string): string => {
    const proto = prototypes.find((p) => p.id === prototypeId);
    const name = planForPrototype(prototypeId)?.input.projectName ?? prototypeId;
    return proto ? `${name} (v${proto.version})` : name;
  };

  const selectedClaudeDesign = claudeDesigns.find((c) => c.id === selectedClaudeDesignId) ?? null;
  const selectedPrototype = selectedClaudeDesign
    ? prototypes.find((p) => p.id === selectedClaudeDesign.prototypeId) ?? null
    : null;
  const selectedPlan = selectedPrototype ? planForPrototype(selectedPrototype.id) : null;

  const handleExportJson = () => {
    if (!selectedClaudeDesign) return;
    downloadBlob(
      JSON.stringify(selectedClaudeDesign, null, 2),
      `claude-design-${selectedClaudeDesign.id}.json`,
      "application/json"
    );
  };

  const handleExportMarkdown = () => {
    if (!selectedClaudeDesign) return;
    downloadBlob(
      toMarkdown(selectedPlan?.input.projectName ?? selectedClaudeDesign.prototypeId, selectedClaudeDesign),
      `claude-design-${selectedClaudeDesign.id}.md`,
      "text/markdown"
    );
  };

  return (
    <div>
      <PageHeader
        icon="🎨"
        title="Design — Claude Design"
        description="Design Automation Phase 5: Phase 4 Prototype 위에서 Design/UI/Component/Theme/Layout Prompt 5종을 생성합니다."
        actions={
          <Link href="/developer/design/prototype" className="text-xs text-blue-400 hover:underline self-center">
            ← Prototype
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Generate Claude Design Prompts">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Prototype</label>
              <select
                value={selectedPrototypeId}
                onChange={(e) => setSelectedPrototypeId(e.target.value)}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                {prototypes.length === 0 && <option value="">Prototype이 없습니다</option>}
                {prototypes.map((proto) => (
                  <option key={proto.id} value={proto.id}>
                    {prototypeLabel(proto.id)} — {new Date(proto.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {generateError && <StatusMessage tone="error">{generateError}</StatusMessage>}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedPrototypeId}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Claude Design Prompts"}
            </button>

            {prototypes.length === 0 && (
              <p className="text-xs text-gray-500">
                먼저 <Link href="/developer/design/prototype" className="text-blue-400 hover:underline">Prototype</Link>을
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
          ) : claudeDesigns.length === 0 ? (
            <p className="text-sm text-gray-500">아직 생성된 Claude Design 프롬프트가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {claudeDesigns.map((cd) => (
                <li key={cd.id}>
                  <button
                    onClick={() => setSelectedClaudeDesignId(cd.id)}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedClaudeDesignId === cd.id
                        ? "bg-blue-600/20 border border-blue-600"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{prototypeLabel(cd.prototypeId)}</span>
                      {cd.simulated && <Badge tone="warning">Simulated</Badge>}
                    </div>
                    <span className="text-xs text-gray-500">{new Date(cd.createdAt).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selectedClaudeDesign && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Project">
              <p className="text-sm text-gray-300">{selectedPlan?.input.projectName ?? "—"}</p>
              <p className="text-xs text-gray-500">{selectedPlan?.content.requirementAnalysis.projectSummary}</p>
            </Card>

            <Card title="Prototype">
              {selectedPrototype ? (
                <>
                  <p className="text-sm text-gray-300">
                    v{selectedPrototype.version} — {selectedPrototype.content.preview.totalScreens}개 화면,{" "}
                    {selectedPrototype.content.preview.totalInteractions}개 인터랙션
                  </p>
                  <p className="text-xs text-gray-500">{new Date(selectedPrototype.createdAt).toLocaleString()}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </Card>
          </div>

          {PROMPT_SECTIONS.map((section) => (
            <Card key={section.key} title={section.title}>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedClaudeDesign.content[section.key]}</p>
            </Card>
          ))}

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
