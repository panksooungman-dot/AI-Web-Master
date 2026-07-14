import fs from "fs-extra";
import path from "path";
import crypto from "crypto";

/**
 * `ai chat`/`ai prompt execute`처럼 CLI 프로세스를 통해 실행된 호출의 기록.
 * Dashboard의 taskQueue(lib/agents/taskQueue.ts)는 Next.js 서버 프로세스에 상주하는
 * in-memory 상태라 별도 OS 프로세스인 CLI가 관찰·제어할 수 없다(실제 아키텍처 경계) —
 * `ai task`는 이 파일 기반 원장(.runtime/tasks.json)만을 대상으로 동작한다.
 */
export interface TaskLedgerEntry {
  id: string;
  kind: "chat" | "prompt";
  providerId?: string;
  systemPrompt: string;
  userPrompt: string;
  status: "success" | "failed";
  simulated: boolean;
  result?: string;
  error?: string;
  createdAt: string;
}

function ledgerFile(cwd: string): string {
  return path.join(cwd, ".runtime", "tasks.json");
}

export async function listTasks(cwd: string): Promise<TaskLedgerEntry[]> {
  const file = ledgerFile(cwd);

  if (!(await fs.pathExists(file))) {
    return [];
  }

  try {
    const raw = await fs.readJson(file);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function getTask(cwd: string, id: string): Promise<TaskLedgerEntry | null> {
  const entries = await listTasks(cwd);
  return entries.find((entry) => entry.id === id) ?? null;
}

export async function recordTask(
  cwd: string,
  entry: Omit<TaskLedgerEntry, "id" | "createdAt">
): Promise<TaskLedgerEntry> {
  const file = ledgerFile(cwd);
  await fs.ensureDir(path.dirname(file));

  const entries = await listTasks(cwd);
  const record: TaskLedgerEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  };

  entries.push(record);
  await fs.writeJson(file, entries, { spaces: 2 });

  return record;
}
