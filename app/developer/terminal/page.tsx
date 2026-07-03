"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

type LineType = "banner" | "command" | "output" | "error";

interface TerminalLine {
  type: LineType;
  text: string;
}

interface TerminalResponse {
  success: boolean;
  output?: string;
  error?: string;
  cwd?: string;
}

interface CwdResponse {
  cwd: string;
}

const INITIAL_LINES: TerminalLine[] = [
  { type: "banner", text: "AI-WEB-MASTER Terminal v1.0" },
  { type: "banner", text: "Ready..." },
];

export default function TerminalPage() {
  const [command, setCommand] = useState("");
  const [lines, setLines] = useState<TerminalLine[]>(INITIAL_LINES);
  const [isLoading, setIsLoading] = useState(false);
  const [cwd, setCwd] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { currentWorkspace, isHydrated } = useWorkspaceStore();

  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHydrated) return;

    if (currentWorkspace) {
      queueMicrotask(() => setCwd(currentWorkspace.path));
      return;
    }

    fetch("/api/terminal")
      .then((res) => res.json())
      .then((data: CwdResponse) => setCwd(data.cwd))
      .catch(() => setCwd(null));
  }, [isHydrated, currentWorkspace]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const runCommand = async () => {
    const trimmed = command.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setLines((prev) => [...prev, { type: "command", text: trimmed }]);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setCommand("");

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed, cwd }),
      });

      const data = (await res.json()) as TerminalResponse;

      if (typeof data.cwd === "string") {
        setCwd(data.cwd);
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "요청 실패";
      setLines((prev) => [...prev, { type: "error", text: message }]);
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

  const promptLabel = cwd ? `${cwd} >` : "...";

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">💻 AI-WEB-MASTER Terminal</h1>
        <p className="text-gray-400 mt-2">
          Development OS Terminal
        </p>
        {currentWorkspace && (
          <p className="text-sm text-blue-400 mt-1">
            Workspace: <span className="font-semibold">{currentWorkspace.name}</span>
          </p>
        )}
        <p className="font-mono text-sm text-green-400 mt-1">{cwd ?? "Loading..."}</p>
      </div>

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
              disabled={isLoading}
              className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? "Running..." : "Run"}
            </button>
          </div>
        </div>

        <div ref={outputRef} className="h-[500px] overflow-y-auto p-4 font-mono text-sm">
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
            disabled={isLoading}
            placeholder="Type a command..."
            className="w-full rounded bg-gray-900 border border-gray-700 px-4 py-3 outline-none focus:border-green-500 disabled:opacity-50 font-mono"
          />
        </div>
      </div>
    </main>
  );
}
