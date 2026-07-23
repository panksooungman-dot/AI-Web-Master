import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { WebsiteOrderInput, WebsiteOrderRecord, WebsiteOrderStatus } from "./types";

const COLLECTION = "website-orders";

export async function listWebsiteOrders(
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord[]> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getWebsiteOrder(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  return records.find((order) => order.id === id);
}

export async function listWebsiteOrdersByClient(
  clientId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord[]> {
  const records = await listWebsiteOrders(store);
  return records.filter((order) => order.clientId === clientId);
}

export async function createWebsiteOrder(
  input: WebsiteOrderInput,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord> {
  const now = new Date().toISOString();
  const record: WebsiteOrderRecord = {
    id: generateId("website-order"),
    ...input,
    status: "Requested",
    aiJobIds: [],
    websiteIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function updateWebsiteOrderStatus(
  id: string,
  status: WebsiteOrderStatus,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  const index = records.findIndex((order) => order.id === id);
  if (index === -1) return undefined;

  records[index] = { ...records[index], status, updatedAt: new Date().toISOString() };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

export async function addAiJobToWebsiteOrder(
  orderId: string,
  jobId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  const index = records.findIndex((order) => order.id === orderId);
  if (index === -1) return undefined;

  if (!records[index].aiJobIds.includes(jobId)) {
    records[index] = {
      ...records[index],
      aiJobIds: [...records[index].aiJobIds, jobId],
      updatedAt: new Date().toISOString(),
    };
    await store.replaceAll(COLLECTION, records);
  }

  return records[index];
}

export async function addWebsiteToOrder(
  orderId: string,
  websiteId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  const index = records.findIndex((order) => order.id === orderId);
  if (index === -1) return undefined;

  if (!records[index].websiteIds.includes(websiteId)) {
    records[index] = {
      ...records[index],
      websiteIds: [...records[index].websiteIds, websiteId],
      updatedAt: new Date().toISOString(),
    };
    await store.replaceAll(COLLECTION, records);
  }

  return records[index];
}
