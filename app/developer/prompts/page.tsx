"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import { useResolvedCwd } from "@/lib/hooks/useResolvedCwd";
import type { PromptRecord } from "@/lib/prompts/registry";

interface AgentSummary {
  id: string;
  name: string;
  available: boolean;
}

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500";

function parseVariablesInput(value: string): string[] | undefined {
  const list = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

export default function PromptLibraryPage() {
  const { cwd } = useResolvedCwd();

  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");
  const [variablesInput, setVariablesInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [executeStatus, setExecuteStatus] = useState<string | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const loadPrompts = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/prompts")
      .then((res) => res.json())
      .then((data: { prompts: PromptRecord[] }) => setPrompts(data.prompts ?? []))
      .catch(() => setLoadError("Prompt 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(loadPrompts);
    queueMicrotask(() => {
      fetch("/api/agents")
        .then((res) => res.json())
        .then((data: { agents: AgentSummary[] }) => {
          setAgents(data.agents ?? []);
          if (data.agents?.[0]) setSelectedAgent(data.agents[0].id);
        })
        .catch(() => undefined);
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(prompts.map((p) => p.category || "General"));
    return ["All", ...Array.from(set).sort()];
  }, [prompts]);

  const filteredPrompts = useMemo(
    () => (categoryFilter === "All" ? prompts : prompts.filter((p) => p.category === categoryFilter)),
    [prompts, categoryFilter]
  );

  const selectedPrompt = useMemo(
    () => prompts.find((p) => p.id === selectedId) ?? null,
    [prompts, selectedId]
  );
  const latestVersion = selectedPrompt?.versions[selectedPrompt.versions.length - 1];

  const handleCreate = async () => {
    if (!name.trim() || !content.trim() || isSubmitting) {
      setSubmitError("Name·Content는 필수입니다.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category: category.trim() || "General",
          content,
          variables: parseVariablesInput(variablesInput),
        }),
      });

      const data = (await res.json()) as { success: boolean; prompt?: PromptRecord; error?: string };

      if (!data.success || !data.prompt) {
        setSubmitError(data.error ?? "생성 실패");
        return;
      }

      setPrompts((prev) => [data.prompt as PromptRecord, ...prev]);
      setSelectedId(data.prompt.id);
      setName("");
      setDescription("");
      setContent("");
      setVariablesInput("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedPrompt || isPreviewing) return;

    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewResult(null);

    try {
      const res = await fetch(`/api/prompts/${selectedPrompt.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables: previewVariables }),
      });

      const data = (await res.json()) as { success: boolean; rendered?: string; error?: string };

      if (!data.success) {
        setPreviewError(data.error ?? "미리보기 실패");
        return;
      }

      setPreviewResult(data.rendered ?? "");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedPrompt || !selectedAgent || !cwd || isExecuting) return;

    setIsExecuting(true);
    setExecuteError(null);
    setExecuteStatus(null);

    try {
      const res = await fetch(`/api/prompts/${selectedPrompt.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent, cwd }),
      });

      const data = (await res.json()) as { success: boolean; task?: { id: string }; error?: string };

      if (!data.success) {
        setExecuteError(data.error ?? "실행 실패");
        return;
      }

      setExecuteStatus(`Task 큐에 등록되었습니다 (id: ${data.task?.id}). AI Task 화면에서 진행 상황을 확인하세요.`);
    } catch (err) {
      setExecuteError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div {...componentMarker("PromptLibraryPage", "app/developer/prompts/page.tsx")}>
      <PageHeader
        icon="📚"
        title="Prompt Library"
        description="카테고리·변수·버전을 갖춘 프롬프트를 관리하고, 미리보기 후 Agent로 바로 실행합니다."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Create Prompt">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Website Copy Generator" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} placeholder="General" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Content ({"{{variable}}"} 사용 가능)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className={inputClass}
                placeholder={"You are a copywriter for {{brand}}..."}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Variables (comma-separated)</label>
              <input
                value={variablesInput}
                onChange={(e) => setVariablesInput(e.target.value)}
                className={inputClass}
                placeholder="brand, audience"
              />
            </div>

            {submitError && <StatusMessage tone="error">{submitError}</StatusMessage>}

            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="self-start rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "저장 중..." : "Create Prompt"}
            </button>
          </div>
        </Card>

        <Card title="Prompt Detail">
          {!selectedPrompt ? (
            <p className="text-sm text-gray-500">왼쪽 목록에서 프롬프트를 선택하세요.</p>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="font-semibold text-gray-200">{selectedPrompt.name}</p>
                <p className="text-xs text-gray-500">{selectedPrompt.description}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="info">{selectedPrompt.category}</Badge>
                  <Badge tone="neutral">v{latestVersion?.version}</Badge>
                </div>
              </div>

              <div className="rounded border border-gray-800 bg-gray-950 p-3 font-mono text-xs whitespace-pre-wrap text-gray-300">
                {latestVersion?.content}
              </div>

              {latestVersion?.variables && latestVersion.variables.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-gray-400">Preview Variables</p>
                  {latestVersion.variables.map((v) => (
                    <input
                      key={v}
                      placeholder={v}
                      value={previewVariables[v] ?? ""}
                      onChange={(e) => setPreviewVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                      className={inputClass}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={handlePreview}
                disabled={isPreviewing}
                className="self-start rounded bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
              >
                {isPreviewing ? "미리보기 생성 중..." : "Preview"}
              </button>

              {previewError && <StatusMessage tone="error">{previewError}</StatusMessage>}
              {previewResult !== null && (
                <Card variant="console">
                  <pre className="whitespace-pre-wrap text-xs text-green-400">{previewResult}</pre>
                </Card>
              )}

              <div className="border-t border-gray-800 pt-3">
                <p className="text-xs text-gray-400 mb-2">Execute via Agent</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className={inputClass + " w-auto"}>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id} disabled={!agent.available}>
                        {agent.name}{!agent.available ? " (unavailable)" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleExecute}
                    disabled={isExecuting || !cwd}
                    className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
                  >
                    {isExecuting ? "실행 중..." : "Execute"}
                  </button>
                </div>
                {executeError && <StatusMessage tone="error">{executeError}</StatusMessage>}
                {executeStatus && <StatusMessage tone="success">{executeStatus}</StatusMessage>}
              </div>

              {selectedPrompt.versions.length > 1 && (
                <div className="border-t border-gray-800 pt-3">
                  <p className="text-xs text-gray-400 mb-2">Version History</p>
                  <ul className="flex flex-col gap-1 text-xs text-gray-500">
                    {[...selectedPrompt.versions].reverse().map((v) => (
                      <li key={v.version}>
                        v{v.version} — {new Date(v.createdAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Prompts"
        actions={
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass + " w-auto"}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        }
      >
        {isLoading ? (
          <LoadingText />
        ) : loadError ? (
          <StatusMessage tone="error">{loadError}</StatusMessage>
        ) : filteredPrompts.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 프롬프트가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredPrompts.map((prompt) => (
              <li
                key={prompt.id}
                onClick={() => setSelectedId(prompt.id)}
                className={`flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm cursor-pointer transition-colors ${
                  selectedId === prompt.id ? "border-green-600 bg-gray-900" : "border-gray-800 hover:bg-gray-900"
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-200">{prompt.name}</p>
                  <p className="text-xs text-gray-500">{prompt.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="info">{prompt.category}</Badge>
                  <Badge tone="neutral">{prompt.versions.length} version(s)</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
