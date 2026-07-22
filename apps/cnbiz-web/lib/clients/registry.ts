import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { createRecordId } from "@/lib/utils/id";
import type { ClientInput, ClientRecord } from "./types";

const COLLECTION = "clients";

/** Newest first — creates always append, so the store's array order is already oldest→newest. */
export async function listClients(
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord[]> {
  const records = await store.list<ClientRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getClient(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const records = await store.list<ClientRecord>(COLLECTION);
  return records.find((client) => client.id === id);
}

/** 대소문자를 구분하지 않고 이메일로 기존 고객사를 찾는다 — 재문의 시 중복 Client 생성을 막는다. */
export async function findClientByEmail(
  email: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const records = await store.list<ClientRecord>(COLLECTION);
  const normalized = email.trim().toLowerCase();
  return records.find((client) => client.email.trim().toLowerCase() === normalized);
}

export async function createClient(
  input: ClientInput,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord> {
  const now = new Date().toISOString();
  const record: ClientRecord = {
    id: createRecordId("client"),
    ...input,
    inquiryIds: [],
    websiteOrderIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const records = await store.list<ClientRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 이메일로 기존 Client를 찾고, 없으면 새로 만든다. Inquiry → Client 단계의 진입점. */
export async function findOrCreateClientByEmail(
  input: ClientInput,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord> {
  const existing = await findClientByEmail(input.email, store);
  return existing ?? createClient(input, store);
}

export async function addInquiryToClient(
  clientId: string,
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const records = await store.list<ClientRecord>(COLLECTION);
  const index = records.findIndex((client) => client.id === clientId);
  if (index === -1) return undefined;

  if (!records[index].inquiryIds.includes(inquiryId)) {
    records[index] = {
      ...records[index],
      inquiryIds: [...records[index].inquiryIds, inquiryId],
      updatedAt: new Date().toISOString(),
    };
    await store.replaceAll(COLLECTION, records);
  }

  return records[index];
}

export async function addWebsiteOrderToClient(
  clientId: string,
  websiteOrderId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const records = await store.list<ClientRecord>(COLLECTION);
  const index = records.findIndex((client) => client.id === clientId);
  if (index === -1) return undefined;

  if (!records[index].websiteOrderIds.includes(websiteOrderId)) {
    records[index] = {
      ...records[index],
      websiteOrderIds: [...records[index].websiteOrderIds, websiteOrderId],
      updatedAt: new Date().toISOString(),
    };
    await store.replaceAll(COLLECTION, records);
  }

  return records[index];
}
