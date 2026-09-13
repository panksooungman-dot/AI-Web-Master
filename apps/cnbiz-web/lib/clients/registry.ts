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
  const record = await store.getDoc<ClientRecord>(COLLECTION, id);
  return record ?? undefined;
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

/**
 * 2026-09-13 — 실사용 재현: 새 Client를 list()로 읽은 배열에 push한 뒤 replaceAll()로 통째로
 * 다시 쓰는 방식은, 거의 동시에 실행된 다른 요청(Vercel의 다른 서버리스 인스턴스일 수 있음)의
 * replaceAll()이 이 Client가 추가되기 전 스냅샷으로 덮어써버리면 방금 만든 Client가 그대로
 * 사라질 수 있다(lib/db/collectionLock.ts의 락은 같은 프로세스 안에서만 순서를 보장하고,
 * 서로 다른 서버리스 인스턴스 사이의 경합은 막지 못한다). 실제로 "사색찬미한정식" 문의는
 * WebsiteOrder·AiJob·Project Workspace까지 전부 정상 생성됐는데 Client만 사라진 채로
 * 발견되어(파이프라인 "2. Client 생성 전"), 이 경합이 실제로 발생했음을 확인했다.
 * setDoc()은 이 Client 하나의 행만 upsert하고 다른 행을 지우지 않으므로(supabaseStore.ts의
 * setDoc은 delete 단계 자체가 없는 단일 행 upsert), 이 경합에서 완전히 자유롭다.
 */
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

  await store.setDoc(COLLECTION, record.id, record);

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

/** 아래 add·remove·update 계열 함수는 전부 createClient()와 같은 이유로 getDoc()으로 이
 * Client 한 건만 읽고 setDoc()으로 이 Client 한 건만 다시 쓴다 — 다른 Client 행에는 손대지
 * 않으므로 동시에 다른 Client가 추가/수정되는 것과 경합하지 않는다. */
export async function addInquiryToClient(
  clientId: string,
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const client = await store.getDoc<ClientRecord>(COLLECTION, clientId);
  if (!client) return undefined;

  if (!client.inquiryIds.includes(inquiryId)) {
    const updated: ClientRecord = {
      ...client,
      inquiryIds: [...client.inquiryIds, inquiryId],
      updatedAt: new Date().toISOString(),
    };
    await store.setDoc(COLLECTION, clientId, updated);
    return updated;
  }

  return client;
}

export async function addWebsiteOrderToClient(
  clientId: string,
  websiteOrderId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const client = await store.getDoc<ClientRecord>(COLLECTION, clientId);
  if (!client) return undefined;

  if (!client.websiteOrderIds.includes(websiteOrderId)) {
    const updated: ClientRecord = {
      ...client,
      websiteOrderIds: [...client.websiteOrderIds, websiteOrderId],
      updatedAt: new Date().toISOString(),
    };
    await store.setDoc(COLLECTION, clientId, updated);
    return updated;
  }

  return client;
}

export async function updateClient(
  id: string,
  patch: Partial<ClientInput>,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const client = await store.getDoc<ClientRecord>(COLLECTION, id);
  if (!client) return undefined;

  const updated: ClientRecord = {
    ...client,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/** 이 Client의 inquiryIds에서 특정 id만 제거한다(splitInquiryFromClient() 전용 — 의뢰를 다른
 * Client로 옮긴 뒤 예전 Client 쪽 역참조를 정리한다). */
export async function removeInquiryFromClient(
  clientId: string,
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const client = await store.getDoc<ClientRecord>(COLLECTION, clientId);
  if (!client) return undefined;

  if (client.inquiryIds.includes(inquiryId)) {
    const updated: ClientRecord = {
      ...client,
      inquiryIds: client.inquiryIds.filter((id) => id !== inquiryId),
      updatedAt: new Date().toISOString(),
    };
    await store.setDoc(COLLECTION, clientId, updated);
    return updated;
  }

  return client;
}

/** removeInquiryFromClient()와 동일한 목적, websiteOrderIds용. */
export async function removeWebsiteOrderFromClient(
  clientId: string,
  websiteOrderId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ClientRecord | undefined> {
  const client = await store.getDoc<ClientRecord>(COLLECTION, clientId);
  if (!client) return undefined;

  if (client.websiteOrderIds.includes(websiteOrderId)) {
    const updated: ClientRecord = {
      ...client,
      websiteOrderIds: client.websiteOrderIds.filter((id) => id !== websiteOrderId),
      updatedAt: new Date().toISOString(),
    };
    await store.setDoc(COLLECTION, clientId, updated);
    return updated;
  }

  return client;
}

/** add·update 계열과 달리 삭제는 "이 id만 빼고 다시 쓰기"가 필요해 여전히 list()+replaceAll()을
 * 쓴다(CollectionStore에 행 단위 delete가 없음) — 관리자가 드물게, 의도적으로 누르는 액션이라
 * 자동 생성 경로(createClient 등)만큼 동시 요청이 몰릴 가능성이 낮아 우선순위에서 밀어뒀다. */
export async function deleteClient(id: string, store: CollectionStore = getDefaultStore()): Promise<boolean> {
  const records = await store.list<ClientRecord>(COLLECTION);
  const next = records.filter((client) => client.id !== id);
  if (next.length === records.length) return false;

  await store.replaceAll(COLLECTION, next);
  return true;
}
