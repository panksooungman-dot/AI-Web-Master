import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation — Phase 8 (docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md 2번의 Phase 구분,
 * `DESIGN_SYNC.md` 전체). Design(Wireframe/Prototype/Claude Design/Figma 체인)과 Code(이 Phase가
 * 생성하는 결정론적 컴포넌트 코드 스냅샷) 사이의 양방향 동기화 상태를 추적한다. 이 파일은 타입 +
 * fs-JSON registry(fs 의존성 없는 순수 로직은 design-sync-engine.ts), 영속화는 Phase 1~7과
 * 동일한 관례를 그대로 따른다.
 *
 * 이 저장소에는 Design 체인으로부터 실제 파일을 생성해 디스크에 쓰는 "진짜 코드베이스"가 없다
 * (Website Builder v2는 별도의 CLI 파이프라인으로, Design 레코드와 연결되어 있지 않다). 그래서
 * "Code"는 design-sync-engine.ts가 Wireframe의 컴포넌트 인벤토리 + Design Token으로부터
 * 결정론적으로 만들어내는 컴포넌트 코드 스냅샷(문자열)이다 — 실제 파일 시스템에 쓰지 않고
 * SyncRecord 안에 데이터로만 보존한다. 상세 해석은 DESIGN_AUTOMATION_MASTER.md 10번 참고.
 */

export type SyncDirection = "design-to-code" | "code-to-design";
export type SyncStatus = "in_sync" | "conflict" | "rolled_back";
export type SyncAction = "sync" | "rollback";

export interface DesignTokenRef {
  name: string;
  value: string;
}

export interface DesignSnapshot {
  screens: string[];
  components: string[];
  tokens: DesignTokenRef[];
  hash: string;
}

export interface CodeComponentSnapshot {
  name: string;
  file: string;
  code: string;
}

export interface CodeSnapshot {
  components: CodeComponentSnapshot[];
  theme: string;
  hash: string;
}

export type PatchType = "added" | "removed" | "changed";

export interface PatchEntry {
  type: PatchType;
  target: string;
  detail: string;
}

export interface ConflictEntry {
  target: string;
  designValue: string;
  codeValue: string;
}

export interface SyncHistoryEntry {
  id: string;
  version: number;
  action: SyncAction;
  /** rollback 항목에는 없음(그 시점의 sync 방향이 아니라 "복원" 행위이므로). */
  direction?: SyncDirection;
  status: SyncStatus;
  designSnapshot: DesignSnapshot;
  codeSnapshot: CodeSnapshot;
  patch: PatchEntry[];
  conflicts: ConflictEntry[];
  actor: string | null;
  note?: string;
  timestamp: string;
}

export interface SyncRecord {
  id: string;
  /** 이 Sync가 어떤 Phase 6 ReviewRecord를 대상으로 하는지 — Review 하나당 SyncRecord 하나. */
  reviewId: string;
  planId: string;
  /** 이 Sync가 참고한 Phase 7 FigmaRecord(있다면) — Design Token 출처. */
  figmaId: string | null;
  version: number;
  status: SyncStatus;
  direction: SyncDirection;
  designSnapshot: DesignSnapshot;
  codeSnapshot: CodeSnapshot;
  patch: PatchEntry[];
  conflicts: ConflictEntry[];
  history: SyncHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = "design-sync";

function createRecordId(): string {
  return generateId("sync");
}

function createHistoryId(): string {
  return generateId("sync-history");
}

/** 최신순(newest first). */
export async function listSyncRecords(store: CollectionStore = getDefaultStore()): Promise<SyncRecord[]> {
  const records = await store.list<SyncRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getSyncRecord(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<SyncRecord | null> {
  const records = await store.list<SyncRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Review에 연결된 Sync 레코드만(최신순 — Review당 최대 1개이므로 사실상 0/1개). */
export async function listSyncRecordsForReview(
  reviewId: string,
  store: CollectionStore = getDefaultStore()
): Promise<SyncRecord[]> {
  const records = await listSyncRecords(store);
  return records.filter((record) => record.reviewId === reviewId);
}

/** Review당 Sync 레코드는 하나만 유지한다(1:1) — 없으면 null. */
export async function getLatestSyncForReview(
  reviewId: string,
  store: CollectionStore = getDefaultStore()
): Promise<SyncRecord | null> {
  const records = await listSyncRecordsForReview(reviewId, store);
  return records[0] ?? null;
}

export interface RecordSyncEntry {
  reviewId: string;
  planId: string;
  figmaId: string | null;
  direction: SyncDirection;
  designSnapshot: DesignSnapshot;
  codeSnapshot: CodeSnapshot;
  patch: PatchEntry[];
  conflicts: ConflictEntry[];
  status: SyncStatus;
  actor?: string | null;
  note?: string;
}

/**
 * reviewId로 기존 레코드를 찾아 새 히스토리 항목을 추가(version+1)하거나, 없으면 새로 만든다
 * (version 1). Auto Save 원칙(Phase 6과 동일) — 매 Sync 호출마다 즉시 저장소에 재저장한다.
 */
export async function recordSync(
  entry: RecordSyncEntry,
  store: CollectionStore = getDefaultStore()
): Promise<SyncRecord> {
  const records = await store.list<SyncRecord>(COLLECTION);
  const now = new Date().toISOString();
  const existingIndex = records.findIndex((record) => record.reviewId === entry.reviewId);

  const historyEntry: SyncHistoryEntry = {
    id: createHistoryId(),
    version: existingIndex === -1 ? 1 : records[existingIndex].version + 1,
    action: "sync",
    direction: entry.direction,
    status: entry.status,
    designSnapshot: entry.designSnapshot,
    codeSnapshot: entry.codeSnapshot,
    patch: entry.patch,
    conflicts: entry.conflicts,
    actor: entry.actor ?? null,
    note: entry.note,
    timestamp: now,
  };

  if (existingIndex === -1) {
    const record: SyncRecord = {
      id: createRecordId(),
      reviewId: entry.reviewId,
      planId: entry.planId,
      figmaId: entry.figmaId,
      version: 1,
      status: entry.status,
      direction: entry.direction,
      designSnapshot: entry.designSnapshot,
      codeSnapshot: entry.codeSnapshot,
      patch: entry.patch,
      conflicts: entry.conflicts,
      history: [historyEntry],
      createdAt: now,
      updatedAt: now,
    };

    records.push(record);
    await store.replaceAll(COLLECTION, records);
    return record;
  }

  const updated: SyncRecord = {
    ...records[existingIndex],
    figmaId: entry.figmaId,
    version: historyEntry.version,
    status: entry.status,
    direction: entry.direction,
    designSnapshot: entry.designSnapshot,
    codeSnapshot: entry.codeSnapshot,
    patch: entry.patch,
    conflicts: entry.conflicts,
    history: [...records[existingIndex].history, historyEntry],
    updatedAt: now,
  };

  records[existingIndex] = updated;
  await store.replaceAll(COLLECTION, records);
  return updated;
}

export interface RollbackResult {
  success: boolean;
  record?: SyncRecord;
  /** "not_found"(대상 Sync 없음) | "version_not_found"(그런 버전의 히스토리가 없음). */
  errorCode?: "not_found" | "version_not_found";
  error?: string;
}

/**
 * 과거 히스토리 항목(`toVersion`)의 designSnapshot/codeSnapshot으로 레코드의 "현재" 상태를
 * 되돌리고, 그 사실 자체를 새 히스토리 항목(action:"rollback", version+1)으로 남긴다 — 히스토리를
 * 지우거나 덮어쓰지 않고 그대로 보존한다(Phase 6 Review Engine과 동일한 append-only 원칙).
 */
export async function rollbackSyncRecord(
  id: string,
  toVersion: number,
  options: { actor?: string | null; note?: string } = {},
  store: CollectionStore = getDefaultStore()
): Promise<RollbackResult> {
  const records = await store.list<SyncRecord>(COLLECTION);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) {
    return { success: false, errorCode: "not_found", error: `Sync "${id}"을(를) 찾을 수 없습니다.` };
  }

  const target = records[index].history.find((entry) => entry.version === toVersion);
  if (!target) {
    return {
      success: false,
      errorCode: "version_not_found",
      error: `Sync "${id}"에 버전 ${toVersion}이(가) 없습니다.`,
    };
  }

  const now = new Date().toISOString();
  const historyEntry: SyncHistoryEntry = {
    id: createHistoryId(),
    version: records[index].version + 1,
    action: "rollback",
    status: "rolled_back",
    designSnapshot: target.designSnapshot,
    codeSnapshot: target.codeSnapshot,
    patch: [],
    conflicts: [],
    actor: options.actor ?? null,
    note: options.note ?? `버전 ${toVersion}으로 롤백`,
    timestamp: now,
  };

  const updated: SyncRecord = {
    ...records[index],
    version: historyEntry.version,
    status: "rolled_back",
    designSnapshot: target.designSnapshot,
    codeSnapshot: target.codeSnapshot,
    patch: [],
    conflicts: [],
    history: [...records[index].history, historyEntry],
    updatedAt: now,
  };

  records[index] = updated;
  await store.replaceAll(COLLECTION, records);
  return { success: true, record: updated };
}
