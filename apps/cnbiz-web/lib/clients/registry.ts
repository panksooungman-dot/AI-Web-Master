import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { ClientInput, ClientRecord } from "./types";

const COLLECTION = "clients";

export async function listClients(
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord[]> {
  const records = await store.list<ClientRecord>(COLLECTION);
  // /developer/clients는 등록 순서가 아니라 회사명(비어있으면 담당자명)으로 찾아보는 화면이라
  // 가나다순으로 정렬한다 — 이전에는 createdAt 내림차순이라 email 순서처럼 뒤죽박죽으로 보였다.
  return [...records].sort((a, b) =>
    (a.companyName || a.contactName).localeCompare(b.companyName || b.contactName, "ko")
  );
}

export async function getClient(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const records = await store.list<ClientRecord>(COLLECTION);
  return records.find((client) => client.id === id);
}

/** 대소문자를 구분하지 않고 이메일이 일치하는 모든 고객사를 찾는다 — 같은 담당자가 서로 다른
 * 회사(companyName)로 문의하면 이제 Client가 여러 개로 나뉘므로(findOrCreateClient() 참고),
 * 이 이메일이 소유한 고객사가 하나뿐이라고 가정하면 안 되는 곳(Customer Portal 등)은 반드시
 * 이 함수를 써야 한다. */
export async function findClientsByEmail(
  email: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord[]> {
  const records = await store.list<ClientRecord>(COLLECTION);
  const normalized = email.trim().toLowerCase();
  return records.filter((client) => client.email.trim().toLowerCase() === normalized);
}

/** 이메일이 일치하는 고객사 중 첫 번째만 필요한 경우의 편의 함수(findOrCreateClient() 등). */
export async function findClientByEmail(
  email: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  return (await findClientsByEmail(email, store))[0];
}

export async function createClient(
  input: ClientInput,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord> {
  const now = new Date().toISOString();
  const record: ClientRecord = {
    id: generateId("client"),
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

/**
 * 이메일+회사명이 모두 일치하는 기존 Client를 찾고, 없으면 새로 만든다. Inquiry → Client
 * 단계의 진입점. 이메일만으로 판단하면 같은 담당자가 다른 회사 일로 문의했을 때도 기존
 * 고객사에 합쳐져 회사명이 뒤바뀌어 보이는 문제가 있었다(예: "사색찬미한정식" 문의가 이미
 * 같은 이메일을 쓰던 "cnbiz" 고객사에 합쳐짐) — 이제는 이메일이 같아도 회사명이 다르면
 * 별도 Client를 새로 만든다. 회사명이 둘 다 비어있는 경우는 같은 고객사로 취급한다(기존
 * 테스트 데이터처럼 회사명 없이 담당자명만 있는 문의를 위한 하위 호환).
 */
export async function findOrCreateClient(
  input: ClientInput,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord> {
  const candidates = await findClientsByEmail(input.email, store);
  const normalizedCompanyName = input.companyName.trim().toLowerCase();
  const existing = candidates.find(
    (client) => client.companyName.trim().toLowerCase() === normalizedCompanyName
  );
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

export async function updateClient(
  id: string,
  patch: Partial<ClientInput>,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const records = await store.list<ClientRecord>(COLLECTION);
  const index = records.findIndex((client) => client.id === id);
  if (index === -1) return undefined;

  records[index] = {
    ...records[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

export async function deleteClient(id: string, store: CollectionStore = getDefaultStore()): Promise<boolean> {
  const records = await store.list<ClientRecord>(COLLECTION);
  const next = records.filter((client) => client.id !== id);
  if (next.length === records.length) return false;

  await store.replaceAll(COLLECTION, next);
  return true;
}
