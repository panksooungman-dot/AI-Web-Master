import fs from "fs-extra";
import path from "path";
import { OrchestratorError, type OrchestratorRunResult, type OrchestratorStatus } from "./types.js";

function orchestratorRoot(cwd: string): string {
  return path.join(cwd, ".runtime", "orchestrator");
}

function statusFile(cwd: string): string {
  return path.join(orchestratorRoot(cwd), "status.json");
}

function historyFile(cwd: string): string {
  return path.join(orchestratorRoot(cwd), "history.json");
}

function lockFile(cwd: string, workflow: string): string {
  return path.join(orchestratorRoot(cwd), "locks", `${workflow}.lock`);
}

function stopFlagFile(cwd: string, workflow: string): string {
  return path.join(orchestratorRoot(cwd), "locks", `${workflow}.stop`);
}

export async function readStatus(cwd: string): Promise<OrchestratorStatus | null> {
  const file = statusFile(cwd);

  if (!(await fs.pathExists(file))) {
    return null;
  }

  try {
    return await fs.readJson(file);
  } catch {
    return null;
  }
}

export async function writeStatus(cwd: string, status: OrchestratorStatus): Promise<void> {
  const file = statusFile(cwd);
  await fs.ensureDir(path.dirname(file));
  await fs.writeJson(file, status, { spaces: 2 });
}

export async function appendHistory(cwd: string, record: OrchestratorRunResult): Promise<void> {
  const file = historyFile(cwd);
  await fs.ensureDir(path.dirname(file));

  let history: OrchestratorRunResult[] = [];

  if (await fs.pathExists(file)) {
    try {
      const raw = await fs.readJson(file);
      if (Array.isArray(raw)) {
        history = raw;
      }
    } catch {
      history = [];
    }
  }

  history.push(record);
  await fs.writeJson(file, history, { spaces: 2 });
}

/** 동일 워크플로가 이미 orchestrator로 실행 중이면 막는다(중복 실행 방지). */
export async function acquireLock(cwd: string, workflow: string): Promise<void> {
  const file = lockFile(cwd, workflow);
  await fs.ensureDir(path.dirname(file));

  if (await fs.pathExists(file)) {
    throw new OrchestratorError(
      "DUPLICATE_RUNTIME",
      `Orchestrator run for "${workflow}" is already in progress (lock: ${file}). Wait for it to finish, or remove the file if it is stale.`
    );
  }

  await fs.writeJson(file, { pid: process.pid, startedAt: new Date().toISOString() }, { spaces: 2 });
}

export async function releaseLock(cwd: string, workflow: string): Promise<void> {
  await fs.remove(lockFile(cwd, workflow));
}

export async function isLocked(cwd: string, workflow: string): Promise<boolean> {
  return fs.pathExists(lockFile(cwd, workflow));
}

/** `ai orchestrator stop` 이 세팅 — 실행 중인 프로세스가 매 stage 경계에서 이 플래그를 확인한다. */
export async function requestStop(cwd: string, workflow: string): Promise<void> {
  const file = stopFlagFile(cwd, workflow);
  await fs.ensureDir(path.dirname(file));
  await fs.writeJson(file, { requestedAt: new Date().toISOString() }, { spaces: 2 });
}

export async function isStopRequested(cwd: string, workflow: string): Promise<boolean> {
  return fs.pathExists(stopFlagFile(cwd, workflow));
}

export async function clearStopFlag(cwd: string, workflow: string): Promise<void> {
  await fs.remove(stopFlagFile(cwd, workflow));
}
