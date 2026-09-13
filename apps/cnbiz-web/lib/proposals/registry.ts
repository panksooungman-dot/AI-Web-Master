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
  const record = await store.getDoc<ProposalRecord>(COLLECTION, id);
  return record ?? undefined;
}

export async function listProposalsByInquiry(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ProposalRecord[]> {
  const records = await listProposals(store);
  return records.filter((record) => record.inquiryId === inquiryId);
}

/**
 * 2026-09-13 — lib/clients/registry.ts·lib/specifications/registry.ts에서 실제로 재현·수정한
 * 것과 동일한 경합: list()로 읽은 배열에 push한 뒤 replaceAll()로 통째로 다시 쓰면, 거의 동시에
 * 실행된 다른 요청(다른 서버리스 인스턴스일 수 있음)의 replaceAll()이 이 레코드가 추가되기 전
 * 스냅샷으로 덮어써 방금 생성한 문서가 그대로 사라질 수 있다. setDoc()은 이 레코드 한 건만
 * upsert하고 다른 행을 지우지 않으므로 이 경합에서 자유롭다.
 */
export async function createProposal(
  entry: Omit<ProposalRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<ProposalRecord> {
  const record: ProposalRecord = {
    id: generateId("proposal"),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  await store.setDoc(COLLECTION, record.id, record);

  return record;
}

export async function deleteProposal(id: string, store: CollectionStore = getDefaultStore()): Promise<boolean> {
  const records = await store.list<ProposalRecord>(COLLECTION);
  const next = records.filter((record) => record.id !== id);
  if (next.length === records.length) return false;

  await store.replaceAll(COLLECTION, next);
  return true;
}
