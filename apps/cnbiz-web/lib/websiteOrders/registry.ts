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
  const record = await store.getDoc<WebsiteOrderRecord>(COLLECTION, id);
  return record ?? undefined;
}

export async function listWebsiteOrdersByClient(
  clientId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord[]> {
  const records = await listWebsiteOrders(store);
  return records.filter((order) => order.clientId === clientId);
}

/**
 * lib/clients/registry.ts의 createClient()와 동일한 이유(2026-09-13 실사용 재현, 커밋 #83
 * 참고)로 list()+push()+replaceAll() 대신 setDoc()으로 이 WebsiteOrder 한 건만 upsert한다 —
 * 이 컬렉션도 똑같이 "새 주문을 배열에 push한 뒤 통째로 다시 쓰는" 구조라, 거의 동시에 여러
 * 주문이 생성되면(Vercel의 다른 서버리스 인스턴스일 수 있음) 같은 경합으로 방금 만든
 * WebsiteOrder가 사라질 수 있었다. 아래 update·add·reassign·set·ensure 계열도 전부 같은 이유로
 * getDoc()/setDoc()으로 이 주문 한 건만 읽고 쓴다 — 다른 주문 행에는 손대지 않으므로 동시에
 * 다른 주문이 생성·수정되는 것과 경합하지 않는다.
 */
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

  await store.setDoc(COLLECTION, record.id, record);

  return record;
}

export async function updateWebsiteOrderStatus(
  id: string,
  status: WebsiteOrderStatus,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const order = await store.getDoc<WebsiteOrderRecord>(COLLECTION, id);
  if (!order) return undefined;

  const updated: WebsiteOrderRecord = { ...order, status, updatedAt: new Date().toISOString() };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

export async function addAiJobToWebsiteOrder(
  orderId: string,
  jobId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const order = await store.getDoc<WebsiteOrderRecord>(COLLECTION, orderId);
  if (!order) return undefined;

  if (!order.aiJobIds.includes(jobId)) {
    const updated: WebsiteOrderRecord = {
      ...order,
      aiJobIds: [...order.aiJobIds, jobId],
      updatedAt: new Date().toISOString(),
    };
    await store.setDoc(COLLECTION, orderId, updated);
    return updated;
  }

  return order;
}

/** splitInquiryFromClient() 전용 — 잘못 합쳐진 옛 Client에서 분리한 주문을 새 Client로 옮긴다. */
export async function reassignWebsiteOrderClient(
  id: string,
  clientId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const order = await store.getDoc<WebsiteOrderRecord>(COLLECTION, id);
  if (!order) return undefined;

  const updated: WebsiteOrderRecord = { ...order, clientId, updatedAt: new Date().toISOString() };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/** Development OS Project Manager 자동 연결 — lib/aiJobs/worker.ts::triggerWorkspaceProvisioning() 전용. */
export async function setWebsiteOrderProject(
  id: string,
  projectId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const order = await store.getDoc<WebsiteOrderRecord>(COLLECTION, id);
  if (!order) return undefined;

  const updated: WebsiteOrderRecord = { ...order, projectId, updatedAt: new Date().toISOString() };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
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
  const order = await store.getDoc<WebsiteOrderRecord>(COLLECTION, id);
  if (!order) return undefined;

  if (order.shareToken) {
    return order.shareToken;
  }

  const shareToken = generateId("quote");
  const updated: WebsiteOrderRecord = { ...order, shareToken, updatedAt: new Date().toISOString() };
  await store.setDoc(COLLECTION, id, updated);

  return shareToken;
}

export async function getWebsiteOrderByShareToken(
  token: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  return records.find((order) => order.shareToken === token);
}

/** 특정 Website 산출물을 담고 있는 주문을 역방향으로 찾는다(운영 배포 확정 시 고객 알림 대상 조회용). */
export async function getWebsiteOrderByWebsiteId(
  websiteId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const records = await store.list<WebsiteOrderRecord>(COLLECTION);
  return records.find((order) => order.websiteIds.includes(websiteId));
}

export async function addWebsiteToOrder(
  orderId: string,
  websiteId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteOrderRecord | undefined> {
  const order = await store.getDoc<WebsiteOrderRecord>(COLLECTION, orderId);
  if (!order) return undefined;

  if (!order.websiteIds.includes(websiteId)) {
    const updated: WebsiteOrderRecord = {
      ...order,
      websiteIds: [...order.websiteIds, websiteId],
      updatedAt: new Date().toISOString(),
    };
    await store.setDoc(COLLECTION, orderId, updated);
    return updated;
  }

  return order;
}
