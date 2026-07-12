import { exec } from "node:child_process";
import { ToolError, type Tool } from "./types.js";

export interface TerminalInput {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface TerminalOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_BUFFER = 10 * 1024 * 1024;

function isTerminalInput(input: unknown): input is TerminalInput {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof (input as Record<string, unknown>).command === "string" &&
    (input as Record<string, unknown>).command !== ""
  );
}

function runCommand(command: string, cwd: string, timeoutMs: number): Promise<TerminalOutput> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { cwd, timeout: timeoutMs, maxBuffer: MAX_BUFFER },
      (error, stdout, stderr) => {
        if (error && typeof error.code !== "number") {
          // spawn 자체가 실패(명령을 찾을 수 없음 등)한 경우
          reject(error);
          return;
        }
        resolve({ stdout, stderr, exitCode: error?.code ?? 0 });
      }
    );
  });
}

export const terminalTool: Tool = {
  id: "terminal",
  name: "Terminal",
  description: "Run a shell command in the project directory and return stdout/stderr/exit code.",

  async execute(input: unknown): Promise<unknown> {
    if (!isTerminalInput(input)) {
      throw new ToolError("INVALID_INPUT", "terminal", "Expected { command: string, cwd?: string }");
    }

    const cwd = input.cwd ?? process.cwd();
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    try {
      return await runCommand(input.command, cwd, timeoutMs);
    } catch (error) {
      throw new ToolError("EXECUTION_FAILED", "terminal", error instanceof Error ? error.message : String(error));
    }
  }
};
