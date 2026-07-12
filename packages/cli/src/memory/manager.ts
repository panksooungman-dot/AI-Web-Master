import { getOrCreateMemory, loadMemory } from "./loader.js";
import { appendHistoryEntry, deleteMemoryFile, listMemoryFiles, memoryFile, writeMemoryFile } from "./storage.js";
import { MemoryError, type MemoryRecord, type StepMemory, type StepStatus } from "./types.js";

export { getOrCreateMemory, loadMemory } from "./loader.js";

export interface StepUpdate {
  status: StepStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

/** 존재하지 않으면 MemoryError(NOT_FOUND) — `ai memory show`/`export`가 사용한다. */
export async function getMemory(cwd: string, workflow: string): Promise<MemoryRecord> {
  const record = await loadMemory(cwd, workflow);

  if (!record) {
    throw new MemoryError("NOT_FOUND", `No memory found for "${workflow}" (expected ${memoryFile(cwd, workflow)}).`);
  }

  return record;
}

/**
 * 요구사항 5 — 단계 실행 후 output을 저장한다(steps[<agent>] 갱신).
 * Agent Runtime과 Workflow Engine이 공통으로 재사용하는 지점.
 */
export async function updateStep(
  cwd: string,
  workflow: string,
  agentName: string,
  update: StepUpdate
): Promise<MemoryRecord> {
  const record = await getOrCreateMemory(cwd, workflow);
  const previous: StepMemory = record.steps[agentName] ?? { status: "pending", input: {}, output: {} };
  const now = new Date().toISOString();
  const isTerminal = update.status === "completed" || update.status === "failed";

  record.steps[agentName] = {
    ...previous,
    ...update,
    input: update.input ?? previous.input,
    output: update.output ?? previous.output,
    startedAt: previous.startedAt ?? now,
    finishedAt: isTerminal ? now : previous.finishedAt
  };
  record.updatedAt = now;

  await writeMemoryFile(cwd, workflow, record);
  await appendHistoryEntry(cwd, workflow, { event: "step-updated", agent: agentName, status: update.status });

  return record;
}

/** `ai memory list` */
export async function listMemories(cwd: string): Promise<string[]> {
  return listMemoryFiles(cwd);
}

/** `ai memory clear <workflow>` */
export async function clearMemory(cwd: string, workflow: string): Promise<boolean> {
  const removed = await deleteMemoryFile(cwd, workflow);

  if (removed) {
    await appendHistoryEntry(cwd, workflow, { event: "cleared" });
  }

  return removed;
}
