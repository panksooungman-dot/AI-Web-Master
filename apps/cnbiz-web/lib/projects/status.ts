import { runTerminalCommand } from "@/lib/terminal/client";
import type { ProjectHealth } from "@/lib/projects/detect";

export type { ProjectHealth };

export interface ProjectGitStatus {
  hasRepo: boolean;
  branch: string | null;
  dirtyCount: number;
  lastCommit: string | null;
}

export async function fetchGitStatus(cwd: string): Promise<ProjectGitStatus> {
  const [branchResult, statusResult, logResult] = await Promise.all([
    runTerminalCommand("git branch --show-current", { cwd }),
    runTerminalCommand("git status --porcelain", { cwd }),
    runTerminalCommand("git log -1 --oneline", { cwd }),
  ]);

  if (!branchResult.success) {
    return { hasRepo: false, branch: null, dirtyCount: 0, lastCommit: null };
  }

  const branch = branchResult.output?.trim() || null;

  const dirtyCount = statusResult.success
    ? statusResult.output?.split(/\r?\n/).filter((line) => line.trim()).length ?? 0
    : 0;

  const lastCommit = logResult.success ? logResult.output?.trim() || null : null;

  return { hasRepo: true, branch, dirtyCount, lastCommit };
}

export interface AiToolStatus {
  name: string;
  installed: boolean;
  version: string | null;
}

async function checkVersion(command: string): Promise<string | null> {
  const data = await runTerminalCommand(command);
  if (!data.success) return null;

  const firstLine = (data.output ?? "").split(/\r?\n/).find((line) => line.trim());
  return firstLine?.trim() ?? null;
}

export async function fetchAiStatus(): Promise<AiToolStatus[]> {
  const [claudeVersion, cursorVersion] = await Promise.all([
    checkVersion("claude --version"),
    checkVersion("cursor --version"),
  ]);

  return [
    { name: "Claude Code", installed: claudeVersion !== null, version: claudeVersion },
    { name: "Cursor", installed: cursorVersion !== null, version: cursorVersion },
  ];
}

export async function fetchProjectHealth(workspacePath: string): Promise<ProjectHealth | null> {
  try {
    const res = await fetch(`/api/projects/health?path=${encodeURIComponent(workspacePath)}`);
    const data = (await res.json()) as { health?: ProjectHealth };
    return data.health ?? null;
  } catch {
    return null;
  }
}
