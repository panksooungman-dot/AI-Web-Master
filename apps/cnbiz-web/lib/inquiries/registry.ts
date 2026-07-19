import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
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
    id: `inquiry-${Date.now()}`,
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
