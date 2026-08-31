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
  const records = await store.list<EstimateRecord>(COLLECTION);
  return records.find((record) => record.id === id);
}

export async function listEstimatesByInquiry(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord[]> {
  const records = await listEstimates(store);
  return records.filter((record) => record.inquiryId === inquiryId);
}

export async function createEstimate(
  entry: Omit<EstimateRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord> {
  const record: EstimateRecord = {
    id: generateId("estimate"),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<EstimateRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function updateEstimateDocument(
  id: string,
  document: EstimateDocumentDetails,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord | undefined> {
  const records = await store.list<EstimateRecord>(COLLECTION);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return undefined;

  records[index] = { ...records[index], document };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

/** 의뢰자의 수락/거절 결정을 기록한다(한 번 정해지면 다시 다른 값으로 덮어쓸 수 있음 — 재검토 허용). */
export async function recordEstimateClientDecision(
  id: string,
  decision: EstimateClientDecision,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord | undefined> {
  const records = await store.list<EstimateRecord>(COLLECTION);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return undefined;

  records[index] = { ...records[index], clientDecision: decision, clientDecisionAt: new Date().toISOString() };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

/** 견적서 메시지 스레드에 항목을 추가한다(의뢰자·관리자 공용). */
export async function addEstimateMessage(
  id: string,
  from: EstimateMessage["from"],
  body: string,
  store: CollectionStore = getDefaultStore()
): Promise<EstimateRecord | undefined> {
  const records = await store.list<EstimateRecord>(COLLECTION);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return undefined;

  const message: EstimateMessage = { id: generateId("estimate-msg"), from, body, createdAt: new Date().toISOString() };
  records[index] = { ...records[index], messages: [...(records[index].messages ?? []), message] };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}
