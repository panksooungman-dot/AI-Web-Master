import type { DesignDocument } from "@cnbiz/design-system/types/design";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";

/**
 * Design JSON Standardization — Phase 10 (docs/architecture/DESIGN_JSON_MIGRATION_STATUS.md).
 * A dedicated persistence layer for `DesignDocument` — until now, every `*-document-adapter.ts`
 * (Phase 2~7) rebuilt a `DesignDocument` in memory on every call, and nothing ever saved one.
 * This registry gives each project exactly one persisted, versioned, retrievable "current"
 * DesignDocument, following the same fs-JSON `CollectionStore` pattern every other Design
 * Automation registry already uses (`prototype.ts`, `claude-design.ts`, etc.).
 *
 * Why a new registry and not "extending an existing one": `DesignPlanRecord.document`
 * (lib/design/types.ts, Phase 2) already embeds a `DesignDocument`, but it is a Phase-1-scoped
 * memo with no independent identity, version history, or status of its own — it's fixed at Plan
 * creation time and can't be updated without touching `lib/design/registry.ts` (Planning, out of
 * scope this phase). It does not satisfy this phase's identity requirements (projectId/version/
 * createdAt/updatedAt/status, retrievable "current" + history) and isn't a general project-wide
 * concept spanning Storyboard/Wireframe/Prototype/Claude Design. This registry is additive, not a
 * second source of truth for the *document's content* — `DesignDocument` itself (packages/
 * design-system/types/design.ts) remains the only schema; this file only adds a place to persist
 * instances of it.
 *
 * Identity: `projectId` is `DesignPlanRecord.id` — every downstream record in this pipeline
 * (StoryboardRecord.planId, WireframeRecord.planId, PrototypeRecord.planId,
 * ClaudeDesignRecord.planId, ReviewRecord.planId, WebsiteBuildRecord.planId) already uses this
 * same id as "the project" identity; this registry follows that established convention rather
 * than inventing a new one.
 */

export type DesignDocumentStatus = "draft" | "current" | "archived";

export interface DesignDocumentRecord {
  id: string;
  /** = DesignPlanRecord.id (see module doc — the established project identity across this pipeline). */
  projectId: string;
  /**
   * Revision number for this project's persisted DesignDocument history — increments on every
   * save for the same `projectId` (distinct from `document.version`, which is the DesignDocument
   * *schema* version, e.g. "1.1.0" — same naming pattern as PrototypeRecord.version, an existing
   * precedent in this codebase for "auto-incrementing per-parent revision count").
   */
  version: number;
  status: DesignDocumentStatus;
  document: DesignDocument;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = "design-documents";

function createRecordId(): string {
  return `design-document-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface SaveDesignDocumentEntry {
  projectId: string;
  document: DesignDocument;
  status?: DesignDocumentStatus;
}

/**
 * Appends a new version for `entry.projectId` (never overwrites — same append-only history
 * pattern as `prototype.ts`/`review-registry.ts`/`figma.ts`/`design-sync.ts`). `version` is
 * always computed as "current count for this projectId + 1"; callers cannot set it explicitly.
 */
export async function saveDesignDocument(
  entry: SaveDesignDocumentEntry,
  store: CollectionStore = getDefaultStore()
): Promise<DesignDocumentRecord> {
  const records = await store.list<DesignDocumentRecord>(COLLECTION);
  const version = records.filter((record) => record.projectId === entry.projectId).length + 1;
  const now = new Date().toISOString();

  const record: DesignDocumentRecord = {
    id: createRecordId(),
    projectId: entry.projectId,
    version,
    status: entry.status ?? "current",
    document: entry.document,
    createdAt: now,
    updatedAt: now,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first) — every persisted DesignDocument across every project. */
export async function listDesignDocuments(store: CollectionStore = getDefaultStore()): Promise<DesignDocumentRecord[]> {
  const records = await store.list<DesignDocumentRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getDesignDocument(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<DesignDocumentRecord | null> {
  const records = await store.list<DesignDocumentRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 project의 전체 히스토리만(최신순 — 즉 최신 version이 먼저). */
export async function listDesignDocumentsForProject(
  projectId: string,
  store: CollectionStore = getDefaultStore()
): Promise<DesignDocumentRecord[]> {
  const records = await listDesignDocuments(store);
  return records.filter((record) => record.projectId === projectId);
}

/**
 * The project's "current" DesignDocument — the highest-`version` record for `projectId`, or
 * `null` if nothing has been persisted for it yet. This is always retrievable in O(records for
 * this project) without needing a separate "current" pointer/flag.
 */
export async function getLatestDesignDocument(
  projectId: string,
  store: CollectionStore = getDefaultStore()
): Promise<DesignDocumentRecord | null> {
  const records = await listDesignDocumentsForProject(projectId, store);
  if (records.length === 0) return null;

  return records.reduce((latest, record) => (record.version > latest.version ? record : latest));
}

/**
 * Persists a new DesignDocument for a project that already has one — an explicit alias for
 * `saveDesignDocument()` (same append-only-new-version behavior) for callers that are updating
 * an existing project's document rather than creating its first version. Both spellings exist
 * because the task's own API naming ("saveDesignDocument" / "updateDesignDocument") describes two
 * distinct call-site intents even though the underlying operation is identical.
 */
export async function updateDesignDocument(
  projectId: string,
  document: DesignDocument,
  store: CollectionStore = getDefaultStore()
): Promise<DesignDocumentRecord> {
  return saveDesignDocument({ projectId, document }, store);
}
