"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import { runTerminalCommand } from "@/lib/terminal/client";
import type { ConnectionStatus, ProviderStatus } from "@/lib/providers/status";
import type { ProviderSummary } from "@/lib/ai/bridge";

const STATUS_TONES: Record<ConnectionStatus, BadgeTone> = {
  Installed: "success",
  "Not Installed": "neutral",
  Connected: "success",
  Unreachable: "danger",
  Configured: "success",
  "Not Configured": "neutral",
};

type StudioPreset = "chat" | "code" | "content";

const PRESETS: { id: StudioPreset; label: string; system: string; placeholder: string }[] = [
  {
    id: "chat",
    label: "Chat",
    system: "You are a helpful AI assistant inside AI Business OS.",
    placeholder: "무엇을 도와드릴까요?",
  },
  {
    id: "code",
    label: "Code Generation",
    system: "You are an expert software engineer. Respond with working code and brief explanations.",
    placeholder: "예: Next.js Route Handler로 헬스체크 엔드포인트를 작성해줘",
  },
  {
    id: "content",
    label: "Content Generation",
    system: "You are a professional copywriter. Produce clear, persuasive marketing copy.",
    placeholder: "예: 클라우드 마이그레이션 서비스의 히어로 섹션 카피를 작성해줘",
  },
];

async function checkVersion(command: string): Promise<string | null> {
  const data = await runTerminalCommand(command);
  if (!data.success) return null;

  const firstLine = (data.output ?? "").split(/\r?\n/).find((line) => line.trim());
  return firstLine?.trim() ?? null;
}

export default function AiManagerPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [claudeVersion, setClaudeVersion] = useState<string | null>(null);
  const [cursorVersion, setCursorVersion] = useState<string | null>(null);

  const [cliProviders, setCliProviders] = useState<ProviderSummary[]>([]);
  const [preset, setPreset] = useState<StudioPreset>("chat");
  const [studioProvider, setStudioProvider] = useState<string>("");
  const [studioInput, setStudioInput] = useState("");
  const [studioOutput, setStudioOutput] = useState<string | null>(null);
  const [studioMeta, setStudioMeta] = useState<string | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/providers")
        .then((res) => res.json())
        .then((data: { providers: ProviderStatus[] }) => setProviders(data.providers ?? []))
        .catch(() => setLoadError("Provider 상태를 불러오지 못했습니다."))
        .finally(() => setIsLoading(false));

      checkVersion("claude --version").then(setClaudeVersion);
      checkVersion("cursor --version").then(setCursorVersion);

      fetch("/api/ai/providers")
        .then((res) => res.json())
        .then((data: { providers: ProviderSummary[] }) => {
          setCliProviders(data.providers ?? []);
          const defaultProvider = data.providers?.find((p) => p.isDefault);
          if (defaultProvider) setStudioProvider(defaultProvider.id);
        })
        .catch(() => undefined);
    });
  }, []);

  const versionFor: Record<string, string | null> = {
    "claude-code": claudeVersion,
    cursor: cursorVersion,
  };

  const activePreset = PRESETS.find((p) => p.id === preset) ?? PRESETS[0];

  const handleStudioRun = async () => {
    if (!studioInput.trim() || isRunning) return;

    setIsRunning(true);
    setStudioError(null);
    setStudioOutput(null);
    setStudioMeta(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: studioInput,
          system: activePreset.system,
          provider: studioProvider || undefined,
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        content?: string;
        provider?: string;
        model?: string;
        simulated?: boolean;
        error?: string;
      };

      if (!data.success) {
        setStudioError(data.error ?? "요청 실패");
        return;
      }

      setStudioOutput(data.content ?? "");
      setStudioMeta(
        data.simulated ? "[simulated] LLM Provider 미연결" : `${data.provider ?? "-"} / ${data.model ?? "-"}`
      );
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div {...componentMarker("AiWorkspacePage", "app/developer/ai/page.tsx")}>
      <PageHeader
        icon="🤖"
        title="AI Workspace"
        description="Claude Code · Cursor · Local AI(Ollama) · OpenAI · Gemini의 실제 연결 상태를 표시합니다."
      />

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {providers.map((p) => (
            <Card
              key={p.id}
              title={p.name}
              actions={<Badge tone={STATUS_TONES[p.status]}>{p.status}</Badge>}
            >
              <ul className="flex flex-col gap-1.5 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Provider</span>
                  <span className="text-gray-300">{p.provider}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Current Model</span>
                  <span className="font-mono text-xs text-gray-300">{p.model ?? "-"}</span>
                </li>
                {versionFor[p.id] !== undefined && (
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Version</span>
                    <span className="font-mono text-xs text-gray-300">
                      {versionFor[p.id] ?? "설치되지 않음"}
                    </span>
                  </li>
                )}
              </ul>
              {p.detail && <p className="mt-2 text-xs text-gray-500">{p.detail}</p>}
            </Card>
          ))}
        </div>
      )}

      <Card
        title="AI Studio"
        className="mb-6"
        actions={
          <Link href="/developer/ai/tasks" className="text-xs text-blue-400 hover:text-blue-300">
            Task History →
          </Link>
        }
        {...componentMarker("AiStudioCard", "app/developer/ai/page.tsx")}
      >
        <div className="mb-4 flex gap-2 border-b border-gray-800 pb-3">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                preset === p.id ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Provider</label>
            <select
              value={studioProvider}
              onChange={(e) => setStudioProvider(e.target.value)}
              className="w-full max-w-xs rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
            >
              <option value="">기본 provider</option>
              {cliProviders.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.configured}>
                  {p.id}{p.isDefault ? " (default)" : ""}{!p.configured ? " — not configured" : ""}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={studioInput}
            onChange={(e) => setStudioInput(e.target.value)}
            rows={4}
            placeholder={activePreset.placeholder}
            className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
          />

          <button
            onClick={handleStudioRun}
            disabled={isRunning || !studioInput.trim()}
            className="self-start rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            {isRunning ? "실행 중..." : "Run"}
          </button>

          {studioError && <StatusMessage tone="error">{studioError}</StatusMessage>}

          {studioOutput !== null && (
            <Card variant="console">
              <pre className="whitespace-pre-wrap text-xs text-green-400">{studioOutput}</pre>
              {studioMeta && <p className="mt-2 text-xs text-gray-500">{studioMeta}</p>}
            </Card>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link href="/developer/websites">
          <Card title="🌐 Website Generation" className="hover:border-green-600 transition-colors">
            <p className="text-sm text-gray-400">AI Website Builder에서 전체 사이트를 생성합니다.</p>
          </Card>
        </Link>
        <Link href="/developer/workflows">
          <Card title="🔁 Workflow Execution" className="hover:border-green-600 transition-colors">
            <p className="text-sm text-gray-400">Workflow Center에서 다단계 자동화를 실행합니다.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
