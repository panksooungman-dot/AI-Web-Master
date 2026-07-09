import type { ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { executeBackground, terminateProcessTree } from "@/lib/commandEngine/engine";
import { detectProjectFiles } from "@/lib/projects/detect";

const PORT_DETECTION_TIMEOUT_MS = 30000;
const LOCAL_URL_PORT_REGEX = /local[^\n]*?:\/\/[^\s:]+:(\d{2,5})/i;
const ANY_URL_PORT_REGEX = /https?:\/\/[^\s:]+:(\d{2,5})/i;

export type DevServerRunState = "starting" | "running" | "error";

interface DevServerState {
  process: ChildProcess | null;
  pid: number | null;
  port: number | null;
  status: DevServerRunState;
  startedAt: string;
  error?: string;
}

const servers = new Map<string, DevServerState>();

// `ai devmode`(CLI)는 이 Next.js 프로세스와 완전히 별도의 프로세스로 dev
// 서버를 실행하므로, 위 인메모리 Map만으로는 CLI가 시작한 서버를 이
// 프로세스가 알 수 없다(서로 다른 프로세스는 메모리를 공유하지 않는다).
// CLI와 Development OS가 동일한 상태(PID·Port·Status)를 보도록, 워크스페이스
// 경로 기준으로 상태를 파일에도 함께 남겨 어느 프로세스에서 조회하든 같은
// 값을 읽을 수 있게 한다. 파일 스키마는 packages/cli/src/lib/devServer.js의
// persistDevServerState()와 반드시 일치해야 한다.
interface PersistedDevServerState {
  pid: number | null;
  port: number | null;
  status: DevServerRunState;
  startedAt: string;
  error?: string;
}

function normalizeWorkspaceKey(workspacePath: string): string {
  return path.resolve(workspacePath).replace(/\\/g, "/").toLowerCase();
}

function stateFilePath(workspacePath: string): string {
  return path.join(workspacePath, "lib", "data", "devservers.json");
}

function readPersistedStates(workspacePath: string): Record<string, PersistedDevServerState> {
  try {
    const raw = fs.readFileSync(stateFilePath(workspacePath), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? (parsed as Record<string, PersistedDevServerState>) : {};
  } catch {
    return {};
  }
}

function readPersistedState(workspacePath: string): PersistedDevServerState | null {
  const all = readPersistedStates(workspacePath);
  return all[normalizeWorkspaceKey(workspacePath)] ?? null;
}

function writePersistedState(workspacePath: string, state: PersistedDevServerState | null): void {
  try {
    const file = stateFilePath(workspacePath);
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const all = readPersistedStates(workspacePath);
    const key = normalizeWorkspaceKey(workspacePath);
    if (state) all[key] = state;
    else delete all[key];

    fs.writeFileSync(file, JSON.stringify(all, null, 2), "utf-8");
  } catch {
    // 상태 공유는 best-effort다 — 파일 쓰기 실패가 dev 서버 실행 자체를
    // 막아서는 안 된다.
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function packageManagerCommand(packageManager: string | null): string {
  switch (packageManager) {
    case "pnpm":
      return "pnpm dev";
    case "yarn":
      return "yarn dev";
    case "bun":
      return "bun run dev";
    default:
      return "npm run dev";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasDevScript(workspacePath: string): boolean {
  try {
    const raw = fs.readFileSync(path.join(workspacePath, "package.json"), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) && isRecord(parsed.scripts) && typeof parsed.scripts.dev === "string";
  } catch {
    return false;
  }
}

function extractPort(buffer: string): number | null {
  const localMatch = buffer.match(LOCAL_URL_PORT_REGEX);
  if (localMatch) return Number(localMatch[1]);

  const anyMatch = buffer.match(ANY_URL_PORT_REGEX);
  return anyMatch ? Number(anyMatch[1]) : null;
}

/** 최대 30초 동안 dev 서버의 stdout을 폴링해 "Local: http://localhost:3000" 류의 로그에서 포트를 추출한다. */
function watchPort(workspacePath: string, child: ChildProcess): void {
  let buffer = "";
  let expired = false;

  const timer = setTimeout(() => {
    expired = true;
  }, PORT_DETECTION_TIMEOUT_MS);

  const onData = (data: Buffer) => {
    if (expired) return;

    buffer += data.toString();
    const port = extractPort(buffer);

    if (port !== null) {
      const state = servers.get(workspacePath);
      if (state && state.process === child) {
        state.port = port;
        writePersistedState(workspacePath, {
          pid: state.pid,
          port: state.port,
          status: state.status,
          startedAt: state.startedAt,
        });
      }
      clearTimeout(timer);
      child.stdout?.off("data", onData);
    }
  };

  child.stdout?.on("data", onData);
}

export interface StartResult {
  success: boolean;
  pid?: number;
  error?: string;
}

export function isDevServerRunning(workspacePath: string): boolean {
  const state = servers.get(workspacePath);
  if (state) return state.status === "running";
  return readPersistedState(workspacePath)?.status === "running";
}

export interface DevServerStatus {
  running: boolean;
  status: DevServerRunState | "stopped";
  pid: number | null;
  port: number | null;
  error?: string;
}

export function getDevServerStatus(workspacePath: string): DevServerStatus {
  const state = servers.get(workspacePath);

  if (state) {
    return {
      running: state.status === "running",
      status: state.status,
      pid: state.pid,
      port: state.port,
      error: state.error,
    };
  }

  // 이 프로세스가 직접 시작하지 않은 dev 서버(예: `ai devmode`로 CLI가
  // 별도 프로세스에서 시작한 경우)도 같은 워크스페이스라면 공유 상태
  // 파일에서 확인한다.
  const persisted = readPersistedState(workspacePath);
  if (!persisted) {
    return { running: false, status: "stopped", pid: null, port: null };
  }

  if (persisted.status === "running" && persisted.pid !== null && !isPidAlive(persisted.pid)) {
    writePersistedState(workspacePath, null);
    return { running: false, status: "stopped", pid: null, port: null };
  }

  return {
    running: persisted.status === "running",
    status: persisted.status,
    pid: persisted.pid,
    port: persisted.port,
    error: persisted.error,
  };
}

export async function startDevServer(workspacePath: string): Promise<StartResult> {
  const existing = servers.get(workspacePath) ?? readPersistedState(workspacePath);

  if (existing && (existing.status === "starting" || existing.status === "running")) {
    if (existing.status === "running" && existing.pid !== null && !isPidAlive(existing.pid)) {
      // 파일에는 남아있지만 실제로는 죽은 프로세스 — 새로 시작할 수 있게 정리
      writePersistedState(workspacePath, null);
    } else {
      return { success: false, error: "이미 실행 중입니다." };
    }
  }

  if (!fs.existsSync(path.join(workspacePath, "package.json"))) {
    return { success: false, error: "package.json을 찾을 수 없습니다." };
  }

  if (!hasDevScript(workspacePath)) {
    return { success: false, error: "package.json에 dev 스크립트가 없습니다." };
  }

  const startedAt = new Date().toISOString();
  servers.set(workspacePath, { process: null, pid: null, port: null, status: "starting", startedAt });
  writePersistedState(workspacePath, { pid: null, port: null, status: "starting", startedAt });

  const { packageManager } = detectProjectFiles(workspacePath);
  const command = packageManagerCommand(packageManager);

  const result = await executeBackground(command, { cwd: workspacePath, category: "devserver" });

  if (!result.success || !result.process) {
    servers.set(workspacePath, {
      process: null,
      pid: null,
      port: null,
      status: "error",
      startedAt,
      error: result.error,
    });
    writePersistedState(workspacePath, {
      pid: null,
      port: null,
      status: "error",
      startedAt,
      error: result.error,
    });
    return { success: false, error: result.error };
  }

  const child = result.process;

  servers.set(workspacePath, {
    process: child,
    pid: child.pid ?? null,
    port: null,
    status: "running",
    startedAt,
  });
  writePersistedState(workspacePath, {
    pid: child.pid ?? null,
    port: null,
    status: "running",
    startedAt,
  });

  // Start() 응답(성공 판정)은 짧은 settleMs 이후 확정되므로, 그 뒤에 프로세스가
  // 실제로는 실패(포트 충돌·Next.js 단일 인스턴스 락 등)하는 경우가 있다. 이때
  // 원인 없이 상태를 그냥 지워버리면 "Start 성공 메시지는 떴는데 카드는 계속
  // Stopped"로 보여 상태 갱신이 안 되는 것처럼 오인된다. 실제 종료 원인을
  // 남겨 status를 error로 명확히 전환한다.
  let outputTail = "";
  const appendOutput = (data: Buffer) => {
    outputTail = (outputTail + data.toString()).slice(-2000);
  };
  child.stdout?.on("data", appendOutput);
  child.stderr?.on("data", appendOutput);

  child.on("exit", (code) => {
    const state = servers.get(workspacePath);
    if (state && state.process === child) {
      const message = outputTail.trim() || `프로세스가 예기치 않게 종료되었습니다 (종료 코드 ${code}).`;
      servers.set(workspacePath, {
        process: null,
        pid: null,
        port: null,
        status: "error",
        startedAt: state.startedAt,
        error: message,
      });
      writePersistedState(workspacePath, {
        pid: null,
        port: null,
        status: "error",
        startedAt: state.startedAt,
        error: message,
      });
    }
  });

  watchPort(workspacePath, child);

  return { success: true, pid: child.pid };
}

export interface StopResult {
  success: boolean;
  error?: string;
}

export async function stopDevServer(workspacePath: string): Promise<StopResult> {
  const state = servers.get(workspacePath) ?? readPersistedState(workspacePath);

  if (!state) {
    return { success: true };
  }

  if (!state.pid) {
    servers.delete(workspacePath);
    writePersistedState(workspacePath, null);
    return { success: true };
  }

  const result = await terminateProcessTree(state.pid);

  if (result.success) {
    servers.delete(workspacePath);
    writePersistedState(workspacePath, null);
  }

  return result;
}

export async function restartDevServer(workspacePath: string): Promise<StartResult> {
  const stopResult = await stopDevServer(workspacePath);

  if (!stopResult.success) {
    return { success: false, error: stopResult.error };
  }

  return startDevServer(workspacePath);
}
