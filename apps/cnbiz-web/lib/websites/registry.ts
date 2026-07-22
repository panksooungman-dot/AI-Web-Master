import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { createRecordId } from "@/lib/utils/id";

export type WebsiteGenerationStatus = "Success" | "Failed";

export interface WebsiteRecord {
  id: string;
  name: string;
  siteType: string;
  outDir: string;
  status: WebsiteGenerationStatus;
  simulatedContent: boolean;
  error?: string;
  createdAt: string;
}

export interface CreateWebsiteRecordInput {
  name: string;
  siteType: string;
  outDir: string;
  status: WebsiteGenerationStatus;
  simulatedContent: boolean;
  error?: string;
}

const COLLECTION = "websites";

/**
 * Newest first — this is the "Recent Websites / Generation History" list. Creates always
 * append, so the store's array order is already oldest→newest.
 */
export async function listWebsites(store: CollectionStore = getDefaultStore()): Promise<WebsiteRecord[]> {
  const records = await store.list<WebsiteRecord>(COLLECTION);
  return [...records].reverse();
}

export async function createWebsiteRecord(
  input: CreateWebsiteRecordInput,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteRecord> {
  const record: WebsiteRecord = {
    id: createRecordId("website"),
    name: input.name,
    siteType: input.siteType,
    outDir: input.outDir,
    status: input.status,
    simulatedContent: input.simulatedContent,
    error: input.error,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<WebsiteRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}
