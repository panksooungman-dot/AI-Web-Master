import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { SpecificationRecord } from "./types";

const COLLECTION = "specifications";

/** 최신순(newest first). */
export async function listSpecifications(
  store: CollectionStore = getDefaultStore()
): Promise<SpecificationRecord[]> {
  const records = await store.list<SpecificationRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSpecification(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<SpecificationRecord | undefined> {
  const records = await store.list<SpecificationRecord>(COLLECTION);
  return records.find((record) => record.id === id);
}

export async function listSpecificationsByInquiry(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<SpecificationRecord[]> {
  const records = await listSpecifications(store);
  return records.filter((record) => record.inquiryId === inquiryId);
}

export async function createSpecification(
  entry: Omit<SpecificationRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<SpecificationRecord> {
  const record: SpecificationRecord = {
    id: generateId("specification"),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<SpecificationRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}
