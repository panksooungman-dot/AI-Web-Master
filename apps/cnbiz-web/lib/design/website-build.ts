import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { WebsiteGenerationStatus } from "@/lib/websites/registry";

/**
 * Design Automation — Phase 9 (docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md 2번의 Phase 구분).
 * Website Builder v2 자체의 생성 결과는 새 저장소를 만들지 않고 기존
 * `lib/websites/registry.ts`(WebsiteRecord)를 그대로 재사용한다("Do not implement another
 * generation engine"). 이 파일은 그 생성 결과가 어떤 Phase 6 ReviewRecord로부터 트리거됐는지만
 * 추적하는 얇은 연결 레지스트리다(Phase 7 Figma·Phase 8 Design Sync와 동일한 관례 — Review당
 * 레코드 하나(1:1), Build를 실행할 때마다 새 history 항목이 추가되고 version이 1씩 증가한다).
 */

export interface WebsiteBuildHistoryEntry {
  id: string;
  version: number;
  /** 이 Build가 만든 lib/websites/registry.ts의 WebsiteRecord.id(실제 생성 데이터는 그쪽에 있음). */
  websiteId: string;
  siteType: string;
  status: WebsiteGenerationStatus;
  simulatedContent: boolean;
  error?: string;
  actor: string | null;
  timestamp: string;
}

export interface WebsiteBuildRecord {
  id: string;
  /** 이 Build가 어떤 Phase 6 ReviewRecord로부터 트리거됐는지(lib/design/review.ts). */
  reviewId: string;
  /** Review가 이미 담고 있는 planId를 그대로 복사(Phase 2~8과 동일한 편의 체인). */
  planId: string;
  websiteId: string;
  siteType: string;
  version: number;
  status: WebsiteGenerationStatus;
  simulatedContent: boolean;
  error?: string;
  history: WebsiteBuildHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = "design-website-builds";

function createRecordId(): string {
  return generateId("website-build");
}

function createHistoryId(): string {
  return generateId("website-build-history");
}

/** 최신순(newest first). */
export async function listWebsiteBuilds(store: CollectionStore = getDefaultStore()): Promise<WebsiteBuildRecord[]> {
  const records = await store.list<WebsiteBuildRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getWebsiteBuildRecord(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteBuildRecord | null> {
  const records = await store.list<WebsiteBuildRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Review에 연결된 Build 레코드만(최신순 — Review당 최대 1개이므로 사실상 0/1개). */
export async function listWebsiteBuildsForReview(
  reviewId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteBuildRecord[]> {
  const records = await listWebsiteBuilds(store);
  return records.filter((record) => record.reviewId === reviewId);
}

export async function getLatestWebsiteBuildForReview(
  reviewId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteBuildRecord | null> {
  const records = await listWebsiteBuildsForReview(reviewId, store);
  return records[0] ?? null;
}

export interface RecordWebsiteBuildEntry {
  reviewId: string;
  planId: string;
  websiteId: string;
  siteType: string;
  status: WebsiteGenerationStatus;
  simulatedContent: boolean;
  error?: string;
  actor?: string | null;
}

/**
 * reviewId로 기존 레코드를 찾아 새 history 항목을 추가(version+1)하거나, 없으면 새로 만든다
 * (version 1). Auto Save 원칙(Phase 6~8과 동일) — 매 Build 호출마다 즉시 저장소에 재저장한다.
 */
export async function recordWebsiteBuild(
  entry: RecordWebsiteBuildEntry,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteBuildRecord> {
  const records = await store.list<WebsiteBuildRecord>(COLLECTION);
  const now = new Date().toISOString();
  const existingIndex = records.findIndex((record) => record.reviewId === entry.reviewId);

  const historyEntry: WebsiteBuildHistoryEntry = {
    id: createHistoryId(),
    version: existingIndex === -1 ? 1 : records[existingIndex].version + 1,
    websiteId: entry.websiteId,
    siteType: entry.siteType,
    status: entry.status,
    simulatedContent: entry.simulatedContent,
    error: entry.error,
    actor: entry.actor ?? null,
    timestamp: now,
  };

  if (existingIndex === -1) {
    const record: WebsiteBuildRecord = {
      id: createRecordId(),
      reviewId: entry.reviewId,
      planId: entry.planId,
      websiteId: entry.websiteId,
      siteType: entry.siteType,
      version: 1,
      status: entry.status,
      simulatedContent: entry.simulatedContent,
      error: entry.error,
      history: [historyEntry],
      createdAt: now,
      updatedAt: now,
    };

    records.push(record);
    await store.replaceAll(COLLECTION, records);
    return record;
  }

  const updated: WebsiteBuildRecord = {
    ...records[existingIndex],
    websiteId: entry.websiteId,
    siteType: entry.siteType,
    version: historyEntry.version,
    status: entry.status,
    simulatedContent: entry.simulatedContent,
    error: entry.error,
    history: [...records[existingIndex].history, historyEntry],
    updatedAt: now,
  };

  records[existingIndex] = updated;
  await store.replaceAll(COLLECTION, records);
  return updated;
}
