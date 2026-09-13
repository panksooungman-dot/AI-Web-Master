import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { EstimateClientDecision, EstimateDocumentDetails, EstimateMessage, EstimateRecord } from "./types";

const COLLECTION = "estimates";

/** 최신순(newest first). */
export async function listEstimates(store: CollectionStore = getDefaultStore()): Promise<EstimateRecord[]> {
  const records = await store.list<EstimateRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEstimate(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord | undefined> {
  const record = await store.getDoc<EstimateRecord>(COLLECTION, id);
  return record ?? undefined;
}

export async function listEstimatesByInquiry(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord[]> {
  const records = await listEstimates(store);
  return records.filter((record) => record.inquiryId === inquiryId);
}

/**
 * 2026-09-13 — lib/clients/registry.ts·lib/specifications/registry.ts에서 실제로 재현·수정한
 * 것과 동일한 경합: list()로 읽은 배열에 push한 뒤 replaceAll()로 통째로 다시 쓰면, 거의 동시에
 * 실행된 다른 요청(다른 서버리스 인스턴스일 수 있음)의 replaceAll()이 이 레코드가 추가되기 전
 * 스냅샷으로 덮어써 방금 생성한 문서가 그대로 사라질 수 있다. setDoc()은 이 레코드 한 건만
 * upsert하고 다른 행을 지우지 않으므로 이 경합에서 자유롭다. 아래 update 계열 함수들(수정 전
 * list()+findIndex+replaceAll())도 같은 이유로 getDoc()/setDoc()으로 함께 바꿨다 — 이
 * 견적서 하나만 읽고 이 견적서 하나만 다시 쓰므로 다른 견적서가 동시에 생성/수정되는 것과
 * 경합하지 않는다.
 */
export async function createEstimate(
  entry: Omit<EstimateRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord> {
  const record: EstimateRecord = {
    id: generateId("estimate"),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  await store.setDoc(COLLECTION, record.id, record);

  return record;
}

export async function updateEstimateDocument(
  id: string,
  document: EstimateDocumentDetails,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord | undefined> {
  const record = await store.getDoc<EstimateRecord>(COLLECTION, id);
  if (!record) return undefined;

  const updated: EstimateRecord = { ...record, document };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/** 의뢰자의 수락/거절 결정을 기록한다(한 번 정해지면 다시 다른 값으로 덮어쓸 수 있음 — 재검토 허용). */
export async function recordEstimateClientDecision(
  id: string,
  decision: EstimateClientDecision,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord | undefined> {
  const record = await store.getDoc<EstimateRecord>(COLLECTION, id);
  if (!record) return undefined;

  const updated: EstimateRecord = { ...record, clientDecision: decision, clientDecisionAt: new Date().toISOString() };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/** 견적서 메시지 스레드에 항목을 추가한다(의뢰자·관리자 공용). */
export async function addEstimateMessage(
  id: string,
  from: EstimateMessage["from"],
  body: string,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord | undefined> {
  const record = await store.getDoc<EstimateRecord>(COLLECTION, id);
  if (!record) return undefined;

  const message: EstimateMessage = { id: generateId("estimate-msg"), from, body, createdAt: new Date().toISOString() };
  const updated: EstimateRecord = { ...record, messages: [...(record.messages ?? []), message] };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/** add·update 계열과 달리 삭제는 "이 id만 빼고 다시 쓰기"가 필요해 여전히 list()+replaceAll()을
 * 쓴다(CollectionStore에 행 단위 delete가 없음) — 관리자가 드물게, 의도적으로 누르는 액션이라
 * 자동 생성 경로(createEstimate 등)만큼 동시 요청이 몰릴 가능성이 낮아 우선순위에서 밀어뒀다
 * (lib/clients/registry.ts의 deleteClient()와 동일한 판단). */
export async function deleteEstimate(id: string, store: CollectionStore = getDefaultStore()): Promise<boolean> {
  const records = await store.list<EstimateRecord>(COLLECTION);
  const next = records.filter((record) => record.id !== id);
  if (next.length === records.length) return false;

  await store.replaceAll(COLLECTION, next);
  return true;
}
