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

/** Development OS Project Manager 자동 연결 — lib/aiJobs/worker.ts::triggerWorkspaceProvisioning() 전용. */
export async function setWebsiteOrderProject(
  id: string,
  projectId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  const index = records.findIndex((order) => order.id === id);
  if (index === -1) return undefined;

  records[index] = { ...records[index], projectId, updatedAt: new Date().toISOString() };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

/**
 * 의뢰자 공유 링크(`/quote/[token]`)용 토큰을 반환한다 — 이미 있으면 그대로 재사용하고(재공유
 * 시 같은 링크 유지), 없으면 새로 생성해 저장한다. `shareToken`이 아니라 항상 이 함수를 통해서만
 * 발급해야 링크가 재발급될 때마다 달라지는 문제를 막을 수 있다.
 */
export async function ensureWebsiteOrderShareToken(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<string | undefined> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  const index = records.findIndex((order) => order.id === id);
  if (index === -1) return undefined;

  if (records[index].shareToken) {
    return records[index].shareToken as string;
  }

  const shareToken = generateId("quote");
  records[index] = { ...records[index], shareToken, updatedAt: new Date().toISOString() };
  await store.replaceAll(COLLECTION, records);

  return shareToken;
}

export async function getWebsiteOrderByShareToken(
  token: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  return records.find((order) => order.shareToken === token);
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
