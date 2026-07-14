"use client";

import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { runTerminalCommand } from "@/lib/terminal/client";
import type { ConnectionStatus, ProviderStatus } from "@/lib/providers/status";

const STATUS_TONES: Record<ConnectionStatus, BadgeTone> = {
  Installed: "success",
  "Not Installed": "neutral",
  Connected: "success",
  Unreachable: "danger",
  Configured: "success",
  "Not Configured": "neutral",
};

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

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/providers")
        .then((res) => res.json())
        .then((data: { providers: ProviderStatus[] }) => setProviders(data.providers ?? []))
        .catch(() => setLoadError("Provider 상태를 불러오지 못했습니다."))
        .finally(() => setIsLoading(false));

      checkVersion("claude --version").then(setClaudeVersion);
      checkVersion("cursor --version").then(setCursorVersion);
    });
  }, []);

  const versionFor: Record<string, string | null> = {
    "claude-code": claudeVersion,
    cursor: cursorVersion,
  };

  return (
    <div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
}
