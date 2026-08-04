import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { ProposalRecord } from "./types";

const COLLECTION = "proposals";

/** 최신순(newest first). */
export async function listProposals(store: CollectionStore = getDefaultStore()): Promise<ProposalRecord[]> {
  const records = await store.list<ProposalRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProposal(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ProposalRecord | undefined> {
  const records = await store.list<ProposalRecord>(COLLECTION);
  return records.find((record) => record.id === id);
}

export async function listProposalsByInquiry(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ProposalRecord[]> {
  const records = await listProposals(store);
  return records.filter((record) => record.inquiryId === inquiryId);
}

export async function createProposal(
  entry: Omit<ProposalRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<ProposalRecord> {
  const record: ProposalRecord = {
    id: generateId("proposal"),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<ProposalRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}
