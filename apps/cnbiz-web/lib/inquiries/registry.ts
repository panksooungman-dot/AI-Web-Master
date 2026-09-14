import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { AIAnalysisResult } from "@/lib/ai-analysis/types";
import type { InquiryInput, InquiryRecord, InquiryStatus } from "./types";

const COLLECTION = "inquiries";

export async function listInquiries(
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord[]> {
  const records = await store.list<InquiryRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getInquiry(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord | undefined> {
  const record = await store.getDoc<InquiryRecord>(COLLECTION, id);
  return record ?? undefined;
}

/**
 * lib/clients/registry.ts의 createClient()와 동일한 이유(2026-09-13 실사용 재현, 커밋 #83
 * 참고)로 list()+push()+replaceAll() 대신 setDoc()으로 이 Inquiry 한 건만 upsert한다 —
 * 이 컬렉션도 똑같이 "새 문의를 배열에 push한 뒤 통째로 다시 쓰는" 구조라, 챗봇에서 거의 동시에
 * 여러 문의가 들어오면(Vercel의 다른 서버리스 인스턴스일 수 있음) 같은 경합으로 방금 만든
 * Inquiry가 사라질 수 있었다. deleteInquiry는 clients/registry.ts의 deleteClient와 동일한
 * 이유로 list()+replaceAll() 방식을 유지한다(행 단위 delete가 없고, 드물게 누르는 액션).
 */
export async function createInquiry(
  input: InquiryInput,
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord> {
  const now = new Date().toISOString();
  const record: InquiryRecord = {
    id: generateId("inquiry"),
    ...input,
    status: "New",
    clientId: null,
    websiteOrderId: null,
    createdAt: now,
    updatedAt: now,
  };

  await store.setDoc(COLLECTION, record.id, record);

  return record;
}

/** 고객 정보·상담 내용 등 편집 가능한 필드만 부분 갱신한다(status/clientId 등 파이프라인 상태 필드는 다루지 않음). */
export async function updateInquiry(
  id: string,
  patch: Partial<
    Pick<
      InquiryInput,
      | "companyName"
      | "contactName"
      | "email"
      | "phone"
      | "siteType"
      | "requirements"
      | "budget"
      | "industry"
      | "referenceUrls"
      | "survey"
      | "uploadedFiles"
    >
  >,
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord | undefined> {
  const inquiry = await store.getDoc<InquiryRecord>(COLLECTION, id);
  if (!inquiry) return undefined;

  const updated: InquiryRecord = { ...inquiry, ...patch, updatedAt: new Date().toISOString() };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

export async function deleteInquiry(id: string, store: CollectionStore = getDefaultStore()): Promise<boolean> {
  const records = await store.list<InquiryRecord>(COLLECTION);
  const next = records.filter((inquiry) => inquiry.id !== id);
  if (next.length === records.length) return false;

  await store.replaceAll(COLLECTION, next);
  return true;
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord | undefined> {
  const inquiry = await store.getDoc<InquiryRecord>(COLLECTION, id);
  if (!inquiry) return undefined;

  const updated: InquiryRecord = { ...inquiry, status, updatedAt: new Date().toISOString() };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/**
 * AI Business OS Phase 2 — AI Analysis Engine(lib/ai-analysis) 결과를 저장한다. 새 컬렉션을
 * 만들지 않고 기존 inquiries 컬렉션의 레코드에 필드만 추가한다(app_collections은 JSONB
 * 컬럼이라 스키마 마이그레이션 불필요 — 요구사항의 "가능하면 기존 inquiries metadata 확장"을
 * 그대로 따름). status/clientId/websiteOrderId 등 나머지 필드·파이프라인에는 영향을 주지 않는다.
 */
export async function saveInquiryAnalysis(
  id: string,
  analysis: AIAnalysisResult,
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord | undefined> {
  const inquiry = await store.getDoc<InquiryRecord>(COLLECTION, id);
  if (!inquiry) return undefined;

  const now = new Date().toISOString();
  const updated: InquiryRecord = { ...inquiry, analysis, analyzedAt: now, updatedAt: now };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/** splitInquiryFromClient() 전용 — status/websiteOrderId는 건드리지 않고 clientId만 바꾼다
 * (findOrCreateClient()가 이메일만으로 판단하던 시절 다른 회사 문의가 잘못 합쳐진 것을
 * 나중에 바로잡을 때 사용). */
export async function reassignInquiryClient(
  id: string,
  clientId: string,
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord | undefined> {
  const inquiry = await store.getDoc<InquiryRecord>(COLLECTION, id);
  if (!inquiry) return undefined;

  const updated: InquiryRecord = { ...inquiry, clientId, updatedAt: new Date().toISOString() };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/** Client/WebsiteOrder 생성 후 호출해 이 Inquiry를 그 둘에 연결하고 상태를 Converted로 옮긴다. */
export async function linkInquiryToClientAndOrder(
  id: string,
  clientId: string,
  websiteOrderId: string,
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord | undefined> {
  const inquiry = await store.getDoc<InquiryRecord>(COLLECTION, id);
  if (!inquiry) return undefined;

  const updated: InquiryRecord = {
    ...inquiry,
    clientId,
    websiteOrderId,
    status: "Converted",
    updatedAt: new Date().toISOString(),
  };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}
