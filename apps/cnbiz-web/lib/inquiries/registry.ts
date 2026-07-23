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
  const records = await store.list<InquiryRecord>(COLLECTION);
  return records.find((inquiry) => inquiry.id === id);
}

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

  const records = await store.list<InquiryRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord | undefined> {
  const records = await store.list<InquiryRecord>(COLLECTION);
  const index = records.findIndex((inquiry) => inquiry.id === id);
  if (index === -1) return undefined;

  records[index] = { ...records[index], status, updatedAt: new Date().toISOString() };
  await store.replaceAll(COLLECTION, records);

  return records[index];
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
  const records = await store.list<InquiryRecord>(COLLECTION);
  const index = records.findIndex((inquiry) => inquiry.id === id);
  if (index === -1) return undefined;

  const now = new Date().toISOString();
  records[index] = { ...records[index], analysis, analyzedAt: now, updatedAt: now };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

/** Client/WebsiteOrder 생성 후 호출해 이 Inquiry를 그 둘에 연결하고 상태를 Converted로 옮긴다. */
export async function linkInquiryToClientAndOrder(
  id: string,
  clientId: string,
  websiteOrderId: string,
  store: CollectionStore = getDefaultStore()
): Promise<InquiryRecord | undefined> {
  const records = await store.list<InquiryRecord>(COLLECTION);
  const index = records.findIndex((inquiry) => inquiry.id === id);
  if (index === -1) return undefined;

  records[index] = {
    ...records[index],
    clientId,
    websiteOrderId,
    status: "Converted",
    updatedAt: new Date().toISOString(),
  };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}
