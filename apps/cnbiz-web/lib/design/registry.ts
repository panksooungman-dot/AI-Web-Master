import type { DesignPlanRecord } from "./types";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";

const COLLECTION = "design-plans";

function createRecordId(): string {
  return `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createDesignPlan(
  entry: Omit<DesignPlanRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<DesignPlanRecord> {
  const record: DesignPlanRecord = {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const records = await store.list<DesignPlanRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listDesignPlans(store: CollectionStore = getDefaultStore()): Promise<DesignPlanRecord[]> {
  const records = await store.list<DesignPlanRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getDesignPlan(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<DesignPlanRecord | null> {
  const records = await store.list<DesignPlanRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}
