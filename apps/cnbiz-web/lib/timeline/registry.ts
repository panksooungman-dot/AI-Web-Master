import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { TimelineRecord } from "./types";

const COLLECTION = "timelines";

/** 최신순(newest first). */
export async function listTimelines(store: CollectionStore = getDefaultStore()): Promise<TimelineRecord[]> {
  const records = await store.list<TimelineRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTimeline(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<TimelineRecord | undefined> {
  const records = await store.list<TimelineRecord>(COLLECTION);
  return records.find((record) => record.id === id);
}

export async function listTimelinesByInquiry(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<TimelineRecord[]> {
  const records = await listTimelines(store);
  return records.filter((record) => record.inquiryId === inquiryId);
}

export async function createTimeline(
  entry: Omit<TimelineRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<TimelineRecord> {
  const record: TimelineRecord = {
    id: generateId("timeline"),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<TimelineRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}
