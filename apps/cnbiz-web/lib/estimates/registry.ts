import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { EstimateRecord } from "./types";

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
