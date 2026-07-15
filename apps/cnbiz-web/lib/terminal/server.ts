import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { Shell } from "@/lib/settings/store";
import { eventBus } from "@/lib/events/eventBus";

const CD_PATTERN = /^cd(?:\s+(.*))?$/i;
const VALID_SHELLS: Shell[] = ["PowerShell", "CMD", "Git Bash"];

export function isShell(value: unknown): value is Shell {
  return typeof value === "string" && (VALID_SHELLS as string[]).includes(value);
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function resolveCdTarget(cwd: string, rawTarget: string): string {
  const target = stripQuotes(rawTarget.trim());

  if (!target) return cwd;
  if (target === "~") return os.homedir();

  return path.resolve(cwd, target);
}

export function buildShellInvocation(shell: Shell, command: string): { bin: string; args: string[] } {
  if (shell === "CMD") {
    return { bin: "cmd.exe", args: ["/d", "/s", "/c", `chcp 65001>nul && ${command}`] };
  }

  if (shell === "Git Bash") {
    return { bin: "bash.exe", args: ["-c", command] };
  }

  return {
    bin: "powershell.exe",
    args: [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`,
    ],
  };
}

export interface ExecuteShellOptions {
  shell?: Shell;
  signal?: AbortSignal;
}

export interface ShellExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  cwd: string;
  /** HTTP status hint for API routes; undefined means "200 OK". */
  status?: number;
}

export async function executeShellCommand(
  command: string,
  cwd: string,
  options: ExecuteShellOptions = {}
): Promise<ShellExecutionResult> {
  const { shell = "PowerShell", signal } = options;
  const trimmed = command.trim();
  const category = trimmed.toLowerCase().startsWith("git ") ? "git" : "terminal";

  const emitResult = (result: ShellExecutionResult): ShellExecutionResult => {
    eventBus.emit(category, result.success ? "command.success" : "command.failed", {
      command: trimmed,
      cwd: result.cwd,
      success: result.success,
    });
    return result;
  };

  const cdMatch = trimmed.match(CD_PATTERN);

  if (cdMatch) {
    const resolved = resolveCdTarget(cwd, cdMatch[1] ?? "");

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return emitResult({
        success: false,
        error: `경로를 찾을 수 없습니다: ${cdMatch[1] ?? resolved}`,
        cwd,
        status: 400,
      });
    }

    return emitResult({ success: true, output: "", cwd: resolved });
  }

  try {
    const output = await new Promise<string>((resolve, reject) => {
      const { bin, args } = buildShellInvocation(shell, trimmed);
      const child = spawn(bin, args, { cwd, windowsHide: true });

      let stdout = "";
      let stderr = "";

      const onAbort = () => {
        child.kill();
        reject(new Error("명령이 취소되었습니다."));
      };
      signal?.addEventListener("abort", onAbort);

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        signal?.removeEventListener("abort", onAbort);
        reject(error);
      });

      child.on("close", (code) => {
        signal?.removeEventListener("abort", onAbort);

        if (code === 0) {
          resolve(stdout || stderr);
        } else {
          reject(new Error(stderr || `종료 코드 ${code}`));
        }
      });
    });

    return emitResult({ success: true, output, cwd });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return emitResult({ success: false, error: message, cwd, status: 500 });
  }
}
