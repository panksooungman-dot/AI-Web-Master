import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { DesignPlanInput } from "./types";

/**
 * Design Plan 생성을 "요청 즉시 응답 → 별도 실행 → 폴링" 구조로 바꾸기 위한 Job 레코드.
 * lib/aiJobs(Customer Inquiry Pipeline 전용, AiJobType·processJob() 등)와는 완전히 별개다 —
 * 이 저장소의 기존 원칙(다른 라우트들의 "Customer Inquiry Pipeline은 전혀 건드리지 않는다"는
 * 주석 참고)대로 그쪽은 건드리지 않고, Design Plan 하나만 다루는 훨씬 가벼운 큐를 새로 둔다.
 *
 * 목적: Customer Requirements에 아주 긴 문서를 그대로 붙여넣으면 AI 생성이 270초 가까이 걸릴
 * 수 있는데, 지금까지는 그 한 번의 요청(브라우저 fetch)이 끝까지 살아있어야만 결과를 받을 수
 * 있어 Vercel 함수 실행 시간 제한이나 중간의 네트워크 끊김에 그대로 노출됐다(2026-09-14 실사용
 * — "네트워크 연결이 끊겼거나 서버 응답 시간이 초과됐습니다" 반복 발생). Job으로 분리하면
 * 실제 생성(POST .../jobs/[id]/run)이 진행되는 동안 브라우저 쪽 연결이 끊겨도 서버 쪽 처리는
 * 그대로 이어지고, 화면은 짧은 GET 폴링으로 마지막 상태를 그대로 회수할 수 있다.
 */
export type DesignPlanJobStatus = "Queued" | "Running" | "Success" | "Failed";

export interface DesignPlanJobRecord {
  id: string;
  input: DesignPlanInput;
  status: DesignPlanJobStatus;
  /** Success 상태일 때만 채워지는, 실제 생성된 Design Plan의 id. */
  planId: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

const COLLECTION = "design-plan-jobs";

export async function createDesignPlanJob(
  input: DesignPlanInput,
  store: CollectionStore = getDefaultStore()
): Promise<DesignPlanJobRecord> {
  const record: DesignPlanJobRecord = {
    id: generateId("design-job"),
    input,
    status: "Queued",
    planId: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
  };

  const records = await store.list<DesignPlanJobRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function getDesignPlanJob(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<DesignPlanJobRecord | undefined> {
  const records = await store.list<DesignPlanJobRecord>(COLLECTION);
  return records.find((job) => job.id === id);
}

export interface DesignPlanJobPatch {
  planId?: string | null;
  error?: string | null;
}

/**
 * lib/aiJobs/registry.ts의 updateAiJobStatus()와 동일한 원칙 — Running 전이마다 startedAt을
 * 새로 찍어, 실패 후 재시도(같은 Job id로 다시 run)해도 이번 시도의 소요시간을 정확히 잴 수
 * 있게 한다.
 */
export async function updateDesignPlanJobStatus(
  id: string,
  status: DesignPlanJobStatus,
  patch: DesignPlanJobPatch = {},
  store: CollectionStore = getDefaultStore()
): Promise<DesignPlanJobRecord | undefined> {
  const records = await store.list<DesignPlanJobRecord>(COLLECTION);
  const index = records.findIndex((job) => job.id === id);
  if (index === -1) return undefined;

  const now = new Date().toISOString();
  const current = records[index];
  const updated: DesignPlanJobRecord = {
    ...current,
    ...patch,
    status,
    startedAt: status === "Running" ? now : current.startedAt,
    finishedAt: status === "Success" || status === "Failed" ? now : current.finishedAt,
  };

  records[index] = updated;
  await store.replaceAll(COLLECTION, records);
  return updated;
}
