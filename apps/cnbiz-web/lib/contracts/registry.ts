import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { ContractRecord } from "./types";

const COLLECTION = "contracts";

/** 최신순(newest first). */
export async function listContracts(store: CollectionStore = getDefaultStore()): Promise<ContractRecord[]> {
  const records = await store.list<ContractRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getContract(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ContractRecord | undefined> {
  const records = await store.list<ContractRecord>(COLLECTION);
  return records.find((record) => record.id === id);
}

export async function listContractsByInquiry(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ContractRecord[]> {
  const records = await listContracts(store);
  return records.filter((record) => record.inquiryId === inquiryId);
}

export async function createContract(
  entry: Omit<ContractRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<ContractRecord> {
  const record: ContractRecord = {
    id: generateId("contract"),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<ContractRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}
