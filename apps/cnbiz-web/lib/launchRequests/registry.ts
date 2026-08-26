import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { LaunchRequestRecord } from "./types";

const COLLECTION = "launchRequests";

/** 최신순(newest first). lib/proposals/registry.ts와 완전히 동일한 패턴. */
export async function listLaunchRequests(
  store: CollectionStore = getDefaultStore()
): Promise<LaunchRequestRecord[]> {
  const records = await store.list<LaunchRequestRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLaunchRequest(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<LaunchRequestRecord | undefined> {
  const records = await store.list<LaunchRequestRecord>(COLLECTION);
  return records.find((record) => record.id === id);
}

export async function listLaunchRequestsByInquiry(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<LaunchRequestRecord[]> {
  const records = await listLaunchRequests(store);
  return records.filter((record) => record.inquiryId === inquiryId);
}

export async function createLaunchRequest(
  entry: Omit<LaunchRequestRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<LaunchRequestRecord> {
  const record: LaunchRequestRecord = {
    id: generateId("launchreq"),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<LaunchRequestRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}
