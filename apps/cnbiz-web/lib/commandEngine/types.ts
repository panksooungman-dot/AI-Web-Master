import type { ChildProcess } from "child_process";
import type { Shell } from "@/lib/settings/store";

export type CommandCategory = "development" | "package" | "git" | "utility" | "devserver";

export interface ExecuteOptions {
  cwd: string;
  shell?: Shell;
  signal?: AbortSignal;
  category?: CommandCategory;
}

export interface ExecuteResult {
  success: boolean;
  command: string;
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  error?: string;
}

export interface BackgroundExecuteOptions extends ExecuteOptions {
  /** 이 시간(ms) 동안 조기 종료가 없으면 정상 실행된 것으로 판단한다. */
  settleMs?: number;
}

export interface BackgroundExecuteResult {
  success: boolean;
  pid?: number;
  error?: string;
  /** success일 때만 존재. 호출자가 이후 종료(exit)를 직접 구독할 수 있도록 반환한다. */
  process?: ChildProcess;
}

export interface TerminateResult {
  success: boolean;
  error?: string;
}

export interface CommandRecord {
  id: string;
  command: string;
  category: CommandCategory;
  cwd: string;
  success: boolean;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface CommandHistoryStore {
  record(entry: CommandRecord): void;
  list(limit?: number): CommandRecord[];
}
