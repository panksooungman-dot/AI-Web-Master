"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { runTerminalCommand } from "@/lib/terminal/client";

type ToolStatus = "Running" | "Stopped";

interface LogEntry {
  id: string;
  time: string;
  message: string;
}

async function checkVersion(command: string): Promise<string | null> {
  const data = await runTerminalCommand(command);
  if (!data.success) return null;

  const firstLine = (data.output ?? "").split(/\r?\n/).find((line) => line.trim());
  return firstLine?.trim() ?? null;
}

export default function AiManagerPage() {
  const [claudeStatus, setClaudeStatus] = useState<ToolStatus>("Stopped");
  const [chatGptStatus, setChatGptStatus] = useState<ToolStatus>("Stopped");
  const [chatGptSettingsOpen, setChatGptSettingsOpen] = useState(false);
  const [cursorStatus, setCursorStatus] = useState<ToolStatus>("Stopped");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [claudeVersion, setClaudeVersion] = useState<string | null>(null);
  const [claudeInstalled, setClaudeInstalled] = useState(false);
  const [cursorVersion, setCursorVersion] = useState<string | null>(null);
  const [cursorInstalled, setCursorInstalled] = useState(false);
  const [isCheckingInstalls, setIsCheckingInstalls] = useState(true);

  const ollamaStatus: ToolStatus = "Stopped";
  const ollamaModels = ["llama3:8b", "mistral:7b", "codellama:13b"];

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [
      { id: `${Date.now()}-${prev.length}`, time: new Date().toLocaleTimeString(), message },
      ...prev,
    ]);
  }, []);

  useEffect(() => {
    queueMicrotask(async () => {
      const [claudeVer, cursorVer] = await Promise.all([
        checkVersion("claude --version"),
        checkVersion("cursor --version"),
      ]);

      setClaudeVersion(claudeVer);
      setClaudeInstalled(claudeVer !== null);
      addLog(claudeVer ? `Claude Code 설치 확인됨 (${claudeVer})` : "Claude Code가 설치되어 있지 않습니다.");

      setCursorVersion(cursorVer);
      setCursorInstalled(cursorVer !== null);
      addLog(cursorVer ? `Cursor 설치 확인됨 (${cursorVer})` : "Cursor가 설치되어 있지 않습니다.");

      setIsCheckingInstalls(false);
    });
  }, [addLog]);

  const handleClaudeStart = () => {
    setClaudeStatus("Running");
    addLog("Claude Code 시작됨");
  };

  const handleClaudeStop = () => {
    setClaudeStatus("Stopped");
    addLog("Claude Code 중지됨");
  };

  const handleClaudeRestart = () => {
    setClaudeStatus("Running");
    addLog("Claude Code 재시작됨");
  };

  const handleChatGptOpen = () => {
    setChatGptStatus("Running");
    addLog("ChatGPT 열기");
  };

  const handleChatGptSettings = () => {
    setChatGptSettingsOpen((prev) => !prev);
    addLog("ChatGPT 설정 화면 토글");
  };

  const handleCursorOpen = () => {
    setCursorStatus("Running");
    addLog("Cursor 열기");
  };

  return (
    <div>
      <PageHeader
        icon="🤖"
        title="AI Manager"
        description="Development OS의 AI 도구를 통합 관리합니다."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <Card title="Claude Code" actions={<Badge tone={claudeStatus === "Running" ? "success" : "neutral"}>{claudeStatus}</Badge>}>
          <p className="text-sm text-gray-400 font-mono mb-3">
            Version: {isCheckingInstalls ? "확인 중..." : claudeVersion ?? "설치되지 않음"}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleClaudeStart}
              disabled={claudeStatus === "Running" || !claudeInstalled}
              className="rounded bg-green-600 hover:bg-green-700 px-3 py-1 text-sm transition-colors disabled:opacity-50"
            >
              Start
            </button>
            <button
              onClick={handleClaudeStop}
              disabled={claudeStatus === "Stopped"}
              className="rounded bg-red-600/80 hover:bg-red-700 px-3 py-1 text-sm transition-colors disabled:opacity-50"
            >
              Stop
            </button>
            <button
              onClick={handleClaudeRestart}
              className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1 text-sm transition-colors"
            >
              Restart
            </button>
          </div>
        </Card>

        <Card title="ChatGPT" actions={<Badge tone={chatGptStatus === "Running" ? "success" : "neutral"}>{chatGptStatus}</Badge>}>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={handleChatGptOpen}
              className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors"
            >
              Open
            </button>
            <button
              onClick={handleChatGptSettings}
              className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1 text-sm transition-colors"
            >
              Settings
            </button>
          </div>

          {chatGptSettingsOpen && (
            <div className="rounded border border-gray-700 bg-gray-800 p-3 text-sm text-gray-300 flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Model</span>
                <span>GPT-4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Notifications</span>
                <span>On</span>
              </div>
            </div>
          )}
        </Card>

        <Card title="Cursor" actions={<Badge tone={cursorStatus === "Running" ? "success" : "neutral"}>{cursorStatus}</Badge>}>
          <p className="text-sm text-gray-400 font-mono mb-3">
            Version: {isCheckingInstalls ? "확인 중..." : cursorVersion ?? "설치되지 않음"}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCursorOpen}
              disabled={!cursorInstalled}
              className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors disabled:opacity-50"
            >
              Open
            </button>
          </div>
        </Card>

        <Card title="Ollama" actions={<Badge tone="neutral">{ollamaStatus}</Badge>}>
          <p className="text-xs text-gray-500 mb-3">향후 사용 예정</p>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Installed Models</h3>
            <ul className="font-mono text-xs text-gray-300 space-y-1">
              {ollamaModels.map((model) => (
                <li key={model}>{model}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card title="AI 실행 로그" variant="console">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-600">아직 실행된 작업이 없습니다.</p>
        ) : (
          <ul className="font-mono text-sm text-green-400 space-y-1 max-h-64 overflow-y-auto">
            {logs.map((log) => (
              <li key={log.id}>
                <span className="text-gray-500">[{log.time}]</span> {log.message}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
