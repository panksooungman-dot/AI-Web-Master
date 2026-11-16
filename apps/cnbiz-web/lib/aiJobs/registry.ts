import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
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
    id: generateId("ai-job"),
    ...input,
    status: "Queued",
    progress: 0,
    result: null,
    error: null,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
  };

  // lib/clients/registry.ts의 createClient()와 동일하게 이 Job 한 건만 upsert한다. 이전에는
  // list()로 ai-jobs 전체를 읽어 push한 뒤 replaceAll()로 전부 다시 upsert했는데, Website
  // Builder 결과(result)가 담긴 Job이 쌓일수록 문의 접수(POST /api/inquiries)마다 요청 크기·시간이
  // 함께 커져 어느 시점부터 Supabase 쓰기가 실패해 고객 접수가 서버 오류로 끝날 수 있었다.
  // 접수 경로에서 아직 이 전체 재쓰기 방식을 쓰던 마지막 registry였다.
  await store.setDoc(COLLECTION, record.id, record);

  return record;
}

export interface AiJobStatusPatch {
  progress?: number;
  result?: Record<string, unknown> | null;
  error?: string | null;
}

/**
 * Queued → Running 전이 시 startedAt을 새로 찍고 finishedAt을 비우며, {Success,Failed,
 * Cancelled} 도달 시 finishedAt을 새로 찍는다 — 매 Running 전이가 "이번 시도의 시작"을
 * 뜻하도록 해, 실패한 Job을 재시도(app/api/ai-jobs/[id]/run)할 때도 소요시간을 정확히
 * 계측할 수 있다.
 *
 * 예전에는 둘 다 `current.field ?? now`로 "한 번만 채우고 이후엔 그대로 유지"했는데, 이는
 * Job이 평생 정확히 한 번만 Running에 들어간다는 잘못된 전제였다 — 실제로는 실패 후 재시도가
 * 같은 Job id로 다시 Running에 들어가므로, 재시도 이후에도 startedAt/finishedAt이 최초
 * 실패 시도의 값에 그대로 고정되어 소요시간 계측이 불가능했다(관측성 결함, 2026-08-07 발견·
 * 2026-09-14 수정). 같은 시도 안에서 Running→종료 상태로 이어질 때는 startedAt이 그대로
 * 유지된다는 기존 보장(tests/aiJobs/registry.test.ts)은 그대로 지킨다 — Running 전이 자체가
 * 없는 한 startedAt을 다시 찍지 않기 때문이다.
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
  const isStarting = status === "Running";
  const isTerminal = status === "Success" || status === "Failed" || status === "Cancelled";

  records[index] = {
    ...current,
    ...patch,
    status,
    startedAt: isStarting ? new Date().toISOString() : current.startedAt,
    finishedAt: isStarting ? null : isTerminal ? new Date().toISOString() : current.finishedAt,
  };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}
