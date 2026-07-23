import { execFile, spawn, type ChildProcess } from "child_process";
import { eventBus } from "@/lib/events/eventBus";
import { buildShellInvocation } from "@/lib/terminal/server";
import { generateId } from "@/lib/id";
import { buildOpenUrlCommand, getCommandDefinition, type CommandDefinition } from "./commands";
import { commandHistoryStore } from "./history";
import type {
  BackgroundExecuteOptions,
  BackgroundExecuteResult,
  CommandCategory,
  CommandRecord,
  ExecuteOptions,
  ExecuteResult,
  TerminateResult,
} from "./types";

const DEFAULT_SETTLE_MS = 2000;
const TASKKILL_PID_NOT_FOUND_CODE = 128;

function createRecordId(): string {
  return generateId("cmd");
}

function inferCategory(command: string): CommandCategory {
  const trimmed = command.trim().toLowerCase();

  if (trimmed.startsWith("git ")) return "git";
  if (/^(npm|pnpm|yarn|bun)\s+(install|update|upgrade|add)\b/.test(trimmed)) return "package";
  if (/^(code|explorer|start-process)\b/.test(trimmed)) return "utility";

  return "development";
}

function recordAndEmit(params: {
  command: string;
  category: CommandCategory;
  cwd: string;
  success: boolean;
  exitCode: number | null;
  startedAt: number;
}): void {
  const record: CommandRecord = {
    id: createRecordId(),
    command: params.command,
    category: params.category,
    cwd: params.cwd,
    success: params.success,
    exitCode: params.exitCode,
    startedAt: new Date(params.startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - params.startedAt,
  };

  commandHistoryStore.record(record);

  eventBus.emit(record.category === "git" ? "git" : "terminal", record.success ? "command.success" : "command.failed", {
    command: record.command,
    cwd: record.cwd,
    success: record.success,
  });
}

/** 명령이 종료될 때까지 기다렸다가 stdout/stderr를 모두 수집해 반환한다(빌드·테스트·git 등 1회성 명령용). */
export function execute(command: string, options: ExecuteOptions): Promise<ExecuteResult> {
  const { cwd, shell = "PowerShell", signal, category } = options;
  const trimmed = command.trim();
  const resolvedCategory = category ?? inferCategory(trimmed);
  const startedAt = Date.now();
  const { bin, args } = buildShellInvocation(shell, trimmed);

  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd, windowsHide: true });

    let stdout = "";
    let stderr = "";
    let aborted = false;

    const onAbort = () => {
      aborted = true;
      child.kill();
    };
    signal?.addEventListener("abort", onAbort);

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const finish = (result: ExecuteResult) => {
      signal?.removeEventListener("abort", onAbort);
      recordAndEmit({
        command: trimmed,
        category: resolvedCategory,
        cwd,
        success: result.success,
        exitCode: result.exitCode,
        startedAt,
      });
      resolve(result);
    };

    child.on("error", (error) => {
      finish({
        success: false,
        command: trimmed,
        cwd,
        exitCode: null,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        error: error.message,
      });
    });

    child.on("close", (code) => {
      if (aborted) {
        finish({
          success: false,
          command: trimmed,
          cwd,
          exitCode: code,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
          error: "명령이 취소되었습니다.",
        });
        return;
      }

      finish({
        success: code === 0,
        command: trimmed,
        cwd,
        exitCode: code,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        error: code === 0 ? undefined : stderr.trim() || `종료 코드 ${code}`,
      });
    });
  });
}

/**
 * 종료를 기다리지 않는 장기 실행 명령(dev 서버 등)을 실행한다.
 * settleMs 동안 조기 종료가 없으면 성공으로 판단하고, 이후의 실제 종료 감지는
 * 반환된 process 핸들에 호출자가 직접 리스너를 등록해 처리한다.
 */
export function executeBackground(
  command: string,
  options: BackgroundExecuteOptions
): Promise<BackgroundExecuteResult> {
  const { cwd, shell = "PowerShell", category, settleMs = DEFAULT_SETTLE_MS } = options;
  const trimmed = command.trim();
  const resolvedCategory = category ?? inferCategory(trimmed);
  const startedAt = Date.now();
  const { bin, args } = buildShellInvocation(shell, trimmed);

  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd, windowsHide: true });

    let settled = false;
    let stderr = "";

    const settle = (result: BackgroundExecuteResult, exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      recordAndEmit({
        command: trimmed,
        category: resolvedCategory,
        cwd,
        success: result.success,
        exitCode,
        startedAt,
      });
      resolve(result);
    };

    const timer = setTimeout(() => {
      settle({ success: true, pid: child.pid, process: child }, null);
    }, settleMs);

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      settle({ success: false, error: error.message }, null);
    });

    child.on("exit", (code) => {
      settle({ success: false, error: stderr.trim() || `종료 코드 ${code}` }, code);
    });
  });
}

/** taskkill로 프로세스 트리 전체를 종료한다. 이미 종료된 PID는 오류로 취급하지 않는다. */
export function terminateProcessTree(pid: number): Promise<TerminateResult> {
  return new Promise((resolve) => {
    execFile("taskkill", ["/F", "/T", "/PID", String(pid)], (error, _stdout, stderr) => {
      if (!error) {
        resolve({ success: true });
        return;
      }

      const exitCode = (error as NodeJS.ErrnoException & { code?: number }).code;

      if (exitCode === TASKKILL_PID_NOT_FOUND_CODE) {
        resolve({ success: true });
        return;
      }

      resolve({ success: false, error: stderr.trim() || error.message });
    });
  });
}

export type { ChildProcess };

export function runCatalogCommand(
  id: string,
  cwd: string
): Promise<ExecuteResult | BackgroundExecuteResult> {
  const definition: CommandDefinition | undefined = getCommandDefinition(id);

  if (!definition) {
    return Promise.resolve({
      success: false,
      command: id,
      cwd,
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      error: `등록되지 않은 명령입니다: ${id}`,
    });
  }

  if (definition.background) {
    return executeBackground(definition.command, { cwd, category: definition.category });
  }

  return execute(definition.command, { cwd, category: definition.category });
}

export function openUrl(url: string, cwd: string): Promise<ExecuteResult> {
  return execute(buildOpenUrlCommand(url), { cwd, category: "utility" });
}

export { getCommandHistory } from "./history";

export { COMMAND_CATALOG, getCommandDefinition } from "./commands";
