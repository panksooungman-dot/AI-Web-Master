import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import type { AiJobInput, AiJobRecord, AiJobStatus } from "./types";

const COLLECTION = "ai-jobs";

export async function listAiJobs(
  store: CollectionStore = getDefaultStore()
): Promise<AiJobRecord[]> {
  const records = await store.list<AiJobRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAiJob(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<AiJobRecord | undefined> {
  const records = await store.list<AiJobRecord>(COLLECTION);
  return records.find((job) => job.id === id);
}

export async function listAiJobsByWebsiteOrder(
  websiteOrderId: string,
  store: CollectionStore = getDefaultStore()
): Promise<AiJobRecord[]> {
  const records = await listAiJobs(store);
  return records.filter((job) => job.websiteOrderId === websiteOrderId);
}

export async function createAiJob(
  input: AiJobInput,
  store: CollectionStore = getDefaultStore()
): Promise<AiJobRecord> {
  const now = new Date().toISOString();
  const record: AiJobRecord = {
    id: `ai-job-${Date.now()}`,
    ...input,
    status: "Queued",
    progress: 0,
    result: null,
    error: null,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
  };

  const records = await store.list<AiJobRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export interface AiJobStatusPatch {
  progress?: number;
  result?: Record<string, unknown> | null;
  error?: string | null;
}

/**
 * Queued → Running 전이 시 startedAt을, {Success,Failed,Cancelled} 도달 시 finishedAt을
 * 자동으로 채운다 — 실행기(worker)가 어떤 순서로 호출하든 타임스탬프가 한 번만 기록된다.
 */
export async function updateAiJobStatus(
  id: string,
  status: AiJobStatus,
  patch: AiJobStatusPatch = {},
  store: CollectionStore = getDefaultStore()
): Promise<AiJobRecord | undefined> {
  const records = await store.list<AiJobRecord>(COLLECTION);
  const index = records.findIndex((job) => job.id === id);
  if (index === -1) return undefined;

  const current = records[index];
  const isTerminal = status === "Success" || status === "Failed" || status === "Cancelled";

  records[index] = {
    ...current,
    ...patch,
    status,
    startedAt: current.startedAt ?? (status === "Running" ? new Date().toISOString() : current.startedAt),
    finishedAt: isTerminal ? current.finishedAt ?? new Date().toISOString() : current.finishedAt,
  };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}
