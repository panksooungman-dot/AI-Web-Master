import type { DesignPlanRecord } from "./types";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { planToDesignDocument } from "./design-document-adapter";
import { saveDesignDocument } from "./design-document-registry";

const COLLECTION = "design-plans";

function createRecordId(): string {
  return `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createDesignPlan(
  entry: Omit<DesignPlanRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<DesignPlanRecord> {
  const base: DesignPlanRecord = {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  // Design JSON Standardization Phase 2 — 기존 출력(base)은 그대로 두고 표준
  // DesignDocument를 추가로 파생시킨다(entry.document가 이미 주어졌다면 존중한다).
  const document = base.document ?? planToDesignDocument(base);
  const record: DesignPlanRecord = { ...base, document };

  const records = await store.list<DesignPlanRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  // Design JSON Standardization Phase 10.5 — Planning은 파이프라인의 첫 영속 지점이다.
  // 위에서 이미 확정된 `document`를 다시 계산하지 않고 Phase 10의 saveDesignDocument()로 그대로
  // 저장한다(design-plans와는 별개인 design-documents 컬렉션에 Version 1을 남기는 부수 효과).
  // 반환값(record)의 필드·형태는 이전과 100% 동일하다 — API 응답/Registry 계약 변경 없음.
  await saveDesignDocument({ projectId: record.id, document }, store);

  return record;
}

/** 최신순(newest first). */
export async function listDesignPlans(store: CollectionStore = getDefaultStore()): Promise<DesignPlanRecord[]> {
  const records = await store.list<DesignPlanRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getDesignPlan(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<DesignPlanRecord | null> {
  const records = await store.list<DesignPlanRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}
