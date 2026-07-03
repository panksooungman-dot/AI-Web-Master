"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/developer/PageHeader";
import { useResolvedCwd } from "@/lib/hooks/useResolvedCwd";
import { readSettings, type Shell } from "@/lib/settings/store";
import { runTerminalCommand } from "@/lib/terminal/client";

type LineType = "banner" | "command" | "output" | "error";

interface TerminalLine {
  type: LineType;
  text: string;
}

const INITIAL_LINES: TerminalLine[] = [
  { type: "banner", text: "AI-WEB-MASTER Terminal v1.0" },
  { type: "banner", text: "Ready..." },
];

export default function TerminalPage() {
  const [command, setCommand] = useState("");
  const [lines, setLines] = useState<TerminalLine[]>(INITIAL_LINES);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [shell, setShell] = useState<Shell>("PowerShell");
  const [fontSize, setFontSize] = useState(14);
  const [isMounted, setIsMounted] = useState(false);
  const { cwd, currentWorkspace, error: cwdError } = useResolvedCwd();

  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => setIsMounted(true));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const settings = readSettings();
      setShell(settings.terminal.defaultShell);
      setFontSize(settings.terminal.fontSize);
    });
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const [runtimeCwd, setRuntimeCwd] = useState<string | null>(null);
  const effectiveCwd = runtimeCwd ?? cwd;

  const runCommand = async () => {
    const trimmed = command.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setLines((prev) => [...prev, { type: "command", text: trimmed }]);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setCommand("");

    try {
      const data = await runTerminalCommand(trimmed, { cwd: effectiveCwd, shell });

      if (typeof data.cwd === "string") {
        setRuntimeCwd(data.cwd);
      }

      if (data.success) {
        if (data.output && data.output.trim()) {
          setLines((prev) => [...prev, { type: "output", text: data.output ?? "" }]);
        }
      } else {
        setLines((prev) => [
          ...prev,
          { type: "error", text: data.error ?? "알 수 없는 오류" },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runCommand();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;

      const nextIndex =
        historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommand(history[nextIndex]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;

      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setCommand("");
      } else {
        setHistoryIndex(nextIndex);
        setCommand(history[nextIndex]);
      }
    }
  };

  const handleClear = () => {
    setLines(INITIAL_LINES);
  };

  const promptLabel = effectiveCwd ? `${effectiveCwd} >` : "...";
  const controlsDisabled = isLoading || !isMounted;

  return (
    <div>
      <PageHeader
        icon="💻"
        title="AI-WEB-MASTER Terminal"
        description="Development OS Terminal"
        workspaceName={currentWorkspace?.name}
        path={cwdError ?? effectiveCwd ?? "Loading..."}
      />

      <div className="rounded-xl border border-gray-700 bg-black overflow-hidden shadow-xl">
        <div className="flex items-center justify-between bg-gray-900 px-4 py-3 border-b border-gray-700">
          <span className="font-semibold text-green-400">
            Terminal
          </span>

          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700"
            >
              Clear
            </button>

            <button
              onClick={runCommand}
              disabled={controlsDisabled}
              className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? "Running..." : "Run"}
            </button>
          </div>
        </div>

        <div
          ref={outputRef}
          className="h-[500px] overflow-y-auto p-4 font-mono"
          style={{ fontSize: `${fontSize}px` }}
        >
          {lines.map((line, index) => (
            <div
              key={index}
              className={`whitespace-pre-wrap mb-2 ${
                line.type === "error"
                  ? "text-red-500"
                  : line.type === "command"
                  ? "text-white"
                  : "text-green-400"
              }`}
            >
              {line.type === "command" ? `> ${line.text}` : line.text}
            </div>
          ))}

          {isLoading && (
            <div className="text-yellow-400 whitespace-pre-wrap">
              Running...
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 p-4 flex items-center gap-2">
          <span className="font-mono text-sm text-green-400 whitespace-nowrap">
            {promptLabel}
          </span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={controlsDisabled}
            placeholder="Type a command..."
            style={{ fontSize: `${fontSize}px` }}
            className="w-full rounded bg-gray-900 border border-gray-700 px-4 py-3 outline-none focus:border-green-500 disabled:opacity-50 font-mono"
          />
        </div>
      </div>
    </div>
  );
}
