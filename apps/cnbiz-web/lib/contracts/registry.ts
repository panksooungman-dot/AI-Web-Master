import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { ContractDocumentDetails, ContractRecord, ContractResult, ContractSignature } from "./types";

const COLLECTION = "contracts";

/** 최신순(newest first). */
export async function listContracts(store: CollectionStore = getDefaultStore()): Promise<ContractRecord[]> {
  const records = await store.list<ContractRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getContract(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ContractRecord | undefined> {
  const record = await store.getDoc<ContractRecord>(COLLECTION, id);
  return record ?? undefined;
}

export async function listContractsByInquiry(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ContractRecord[]> {
  const records = await listContracts(store);
  return records.filter((record) => record.inquiryId === inquiryId);
}

/**
 * 2026-09-13 — lib/clients/registry.ts·lib/specifications/registry.ts에서 실제로 재현·수정한
 * 것과 동일한 경합: list()로 읽은 배열에 push한 뒤 replaceAll()로 통째로 다시 쓰면, 거의 동시에
 * 실행된 다른 요청(다른 서버리스 인스턴스일 수 있음)의 replaceAll()이 이 레코드가 추가되기 전
 * 스냅샷으로 덮어써 방금 생성한 문서가 그대로 사라질 수 있다. setDoc()은 이 레코드 한 건만
 * upsert하고 다른 행을 지우지 않으므로 이 경합에서 자유롭다.
 */
export async function createContract(
  entry: Omit<ContractRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<ContractRecord> {
  const record: ContractRecord = {
    id: generateId("contract"),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  await store.setDoc(COLLECTION, record.id, record);

  return record;
}

/**
 * 관리자가 `/developer/contracts/[id]`에서 계약 조항을 직접 수정해 저장한다. 견적서의
 * `updateEstimateDocument()`와 달리 별도 "document" 오버레이 필드를 두지 않고 `result` 자체를
 * 덮어쓴다 — 계약서는 AI 산출물과 별개로 존재하는 "제목·유효기간" 같은 정형 양식이 아니라,
 * 조항(개요·범위·일정·조건 등) 전체가 곧 계약 내용이라 편집 대상과 표시 대상이 같기 때문이다.
 * `/quote/[token]/contract`(의뢰자 공개 페이지)도 동일한 `result` 필드를 그대로 읽으므로 이
 * 함수로 저장한 수정 내용이 별도 배선 없이 그대로 반영된다. setDoc() 기반 upsert라
 * list+replaceAll 경합(위 createContract() 주석 참고)에서 자유롭다.
 */
export async function updateContractResult(
  id: string,
  result: ContractResult,
  store: CollectionStore = getDefaultStore()
): Promise<ContractRecord | undefined> {
  const record = await store.getDoc<ContractRecord>(COLLECTION, id);
  if (!record) return undefined;

  const updated: ContractRecord = { ...record, result };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/**
 * 관리자가 계약서 하단 "계약 당사자"(공급자·의뢰자 정보, 공급자 도장/서명 이미지 URL)를
 * 저장한다. `updateContractResult()`와 별도 필드(`document`)를 쓰는 이유는 result와 달리
 * 이 정보가 AI 판단 대상이 아니라 순수 정형 데이터이기 때문 — lib/estimates/registry.ts의
 * `updateEstimateDocument()`와 동일한 원칙.
 */
export async function updateContractDocument(
  id: string,
  document: ContractDocumentDetails,
  store: CollectionStore = getDefaultStore()
): Promise<ContractRecord | undefined> {
  const record = await store.getDoc<ContractRecord>(COLLECTION, id);
  if (!record) return undefined;

  const updated: ContractRecord = { ...record, document };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

/**
 * 의뢰자가 `/quote/[token]/contract`에서 캔버스에 그려 제출한 서명을 저장한다. 재서명(계약
 * 조건이 바뀌어 다시 서명해야 하는 경우)을 허용하기 위해 기존 값이 있어도 그대로 덮어쓴다.
 */
export async function recordContractClientSignature(
  id: string,
  signature: ContractSignature,
  store: CollectionStore = getDefaultStore()
): Promise<ContractRecord | undefined> {
  const record = await store.getDoc<ContractRecord>(COLLECTION, id);
  if (!record) return undefined;

  const updated: ContractRecord = { ...record, clientSignature: signature };
  await store.setDoc(COLLECTION, id, updated);

  return updated;
}

export async function deleteContract(id: string, store: CollectionStore = getDefaultStore()): Promise<boolean> {
  const records = await store.list<ContractRecord>(COLLECTION);
  const next = records.filter((record) => record.id !== id);
  if (next.length === records.length) return false;

  await store.replaceAll(COLLECTION, next);
  return true;
}
