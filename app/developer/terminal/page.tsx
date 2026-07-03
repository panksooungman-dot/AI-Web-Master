"use client";

import { useState } from "react";

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

  const runCommand = async () => {
    const trimmed = command.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setLines((prev) => [...prev, { type: "command", text: trimmed }]);
    setCommand("");

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });

      const data = await res.json();

      setLines((prev) => [
        ...prev,
        data.success
          ? { type: "output", text: data.output }
          : { type: "error", text: data.error },
      ]);
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
    }
  };

  const handleClear = () => {
    setLines(INITIAL_LINES);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">💻 AI-WEB-MASTER Terminal</h1>
        <p className="text-gray-400 mt-2">
          Development OS Terminal
        </p>
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

        <div className="h-[500px] overflow-y-auto p-4 font-mono text-sm">
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

        <div className="border-t border-gray-700 p-4">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Type a command..."
            className="w-full rounded bg-gray-900 border border-gray-700 px-4 py-3 outline-none focus:border-green-500 disabled:opacity-50"
          />
        </div>
      </div>
    </main>
  );
}
