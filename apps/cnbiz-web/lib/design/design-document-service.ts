import type { DesignDocument } from "@cnbiz/design-system/types/design";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { getLatestDesignDocument, saveDesignDocument } from "./design-document-registry";
import { planToDesignDocument } from "./design-document-adapter";
import { storyboardToDesignDocument } from "./wireframe-document-adapter";
import { wireframeToDesignDocument } from "./prototype-document-adapter";
import { prototypeToDesignDocument } from "./claude-design-document-adapter";
import type { DesignPlanRecord } from "./types";
import type { StoryboardRecord } from "./storyboard";
import type { WireframeRecord } from "./wireframe";
import type { PrototypeRecord } from "./prototype";

/**
 * Design JSON Standardization — Phase 10 (docs/architecture/DESIGN_JSON_MIGRATION_STATUS.md).
 * "Reuse the persisted DesignDocument instead of rebuilding it" — a thin async layer in front of
 * `design-document-registry.ts` + the existing (unmodified) `*-document-adapter.ts` pure builders.
 *
 * Each `getOrBuildDesignDocumentFor*()` below:
 *   1. Looks up `getLatestDesignDocument(projectId)` — if a DesignDocument is already persisted
 *      for this project, return it as-is (no rebuild).
 *   2. Otherwise, calls the SAME pure adapter function every Generator already uses (unchanged,
 *      not reimplemented here) to build one, persists it via `saveDesignDocument()`, and returns
 *      the freshly built document.
 *
 * These functions are not called from any route/registry/generator yet (Planning/Storyboard/
 * Wireframe/Prototype/Claude Design/Website Builder/React Generator are all out of scope this
 * phase — see Remaining Work) — they exist so a future phase can wire them in without needing to
 * touch this persistence layer again. Because nothing currently calls `saveDesignDocument()` in
 * production, every one of these calls today behaves exactly like step 2 alone (build + persist)
 * — i.e. **output is unchanged** from before this phase existed; the "reuse" branch only takes
 * effect once something starts actually saving.
 */

async function getOrBuildDesignDocument(
  projectId: string,
  buildFresh: () => DesignDocument,
  store: CollectionStore
): Promise<DesignDocument> {
  const existing = await getLatestDesignDocument(projectId, store);
  if (existing) return existing.document;

  const built = buildFresh();
  await saveDesignDocument({ projectId, document: built }, store);
  return built;
}

/** Wraps Phase 2's `planToDesignDocument()` — projectId = plan.id. */
export function getOrBuildDesignDocumentForPlan(
  plan: DesignPlanRecord,
  store: CollectionStore = getDefaultStore()
): Promise<DesignDocument> {
  return getOrBuildDesignDocument(plan.id, () => planToDesignDocument(plan), store);
}

/** Wraps Phase 4's `storyboardToDesignDocument()` — projectId = storyboard.planId. */
export function getOrBuildDesignDocumentForStoryboard(
  storyboard: StoryboardRecord,
  store: CollectionStore = getDefaultStore()
): Promise<DesignDocument> {
  return getOrBuildDesignDocument(storyboard.planId, () => storyboardToDesignDocument(storyboard), store);
}

/** Wraps Phase 5's `wireframeToDesignDocument()` — projectId = wireframe.planId. */
export function getOrBuildDesignDocumentForWireframe(
  wireframe: WireframeRecord,
  store: CollectionStore = getDefaultStore()
): Promise<DesignDocument> {
  return getOrBuildDesignDocument(wireframe.planId, () => wireframeToDesignDocument(wireframe), store);
}

/** Wraps Phase 6's `prototypeToDesignDocument()` (richest — sections/theme populated) — projectId = prototype.planId. */
export function getOrBuildDesignDocumentForPrototype(
  prototype: PrototypeRecord,
  store: CollectionStore = getDefaultStore()
): Promise<DesignDocument> {
  return getOrBuildDesignDocument(prototype.planId, () => prototypeToDesignDocument(prototype), store);
}
