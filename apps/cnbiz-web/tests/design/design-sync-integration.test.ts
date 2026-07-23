import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { computeSync } from "../../lib/design/design-sync-engine";
import { getLatestSyncForReview, getSyncRecord, recordSync, rollbackSyncRecord } from "../../lib/design/design-sync";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import { buildDefaultClaudeDesign } from "../../lib/design/claude-design-generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { PrototypeRecord } from "../../lib/design/prototype";

/**
 * Integration coverage for Design Automation Phase 8 (Design Sync), mirroring
 * tests/design/figma-integration.test.ts's approach for Phase 7.
 *
 * As with Phase 1-7, a route-handler-level integration test (constructing a Request and calling
 * app/api/design/sync's route handlers directly) does NOT work in this repo:
 * those routes call getCurrentActorEmail() → next/headers's cookies(), which throws outside the
 * Next.js request-handling runtime. This file integration-tests the layer directly beneath the
 * routes (engine + registry, real filesystem I/O) — the routes themselves are verified via
 * curl/Playwright E2E separately.
 */
describe("Design Automation Phase 8 — design sync engine + registry integration", () => {
  let baseDir: string;

  const planInput: DesignPlanInput = {
    projectName: "Sync Integration Studio",
    projectType: "agency",
    requirements: "포트폴리오, 서비스 소개, 문의가 필요합니다.",
    targetUsers: "잠재 고객",
  };

  const plan: DesignPlanRecord = {
    id: "design-plan-sync-integration",
    input: planInput,
    content: buildDefaultDesignPlan(planInput),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const storyboard: StoryboardRecord = {
    id: "storyboard-sync-integration",
    planId: plan.id,
    content: buildDefaultStoryboard(plan),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const wireframe: WireframeRecord = {
    id: "wireframe-sync-integration",
    storyboardId: storyboard.id,
    planId: plan.id,
    content: buildDefaultWireframe(storyboard),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const prototype: PrototypeRecord = {
    id: "prototype-sync-integration",
    wireframeId: wireframe.id,
    planId: plan.id,
    version: 1,
    content: buildDefaultPrototype(wireframe),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  // Phase 5 output is only used to establish the review→claudeDesign chain elsewhere; this
  // engine works directly off the Wireframe, so claudeDesign content itself is unused here.
  void buildDefaultClaudeDesign(prototype);

  const reviewId = "review-sync-integration";
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-sync-integration-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("runs an initial design-to-code sync and persists it end-to-end (no previous record, always in_sync)", async () => {
    const previous = await getLatestSyncForReview(reviewId, store);
    expect(previous).toBeNull();

    const result = computeSync({ direction: "design-to-code", wireframe, figma: null, previous });
    expect(result.status).toBe("in_sync");

    const record = await recordSync(
      {
        reviewId,
        planId: plan.id,
        figmaId: null,
        direction: "design-to-code",
        designSnapshot: result.designSnapshot,
        codeSnapshot: result.codeSnapshot,
        patch: result.patch,
        conflicts: result.conflicts,
        status: result.status,
      },
      store
    );

    expect(record.version).toBe(1);
    expect((await getSyncRecord(record.id, store))?.reviewId).toBe(reviewId);
  });

  it("re-syncing with no changes produces an empty patch and stays in_sync", async () => {
    const first = computeSync({ direction: "design-to-code", wireframe, figma: null, previous: null });
    const firstRecord = await recordSync(
      { reviewId, planId: plan.id, figmaId: null, direction: "design-to-code", designSnapshot: first.designSnapshot, codeSnapshot: first.codeSnapshot, patch: first.patch, conflicts: first.conflicts, status: first.status },
      store
    );

    const previous = await getLatestSyncForReview(reviewId, store);
    const second = computeSync({ direction: "design-to-code", wireframe, figma: null, previous });

    expect(second.patch).toEqual([]);
    expect(second.status).toBe("in_sync");

    const secondRecord = await recordSync(
      { reviewId, planId: plan.id, figmaId: null, direction: "design-to-code", designSnapshot: second.designSnapshot, codeSnapshot: second.codeSnapshot, patch: second.patch, conflicts: second.conflicts, status: second.status },
      store
    );

    expect(secondRecord.id).toBe(firstRecord.id);
    expect(secondRecord.version).toBe(2);
  });

  it("code-to-design with a diverging override on an already-changed design produces a conflict, persisted with status:conflict", async () => {
    // First sync establishes a baseline.
    const first = computeSync({ direction: "design-to-code", wireframe, figma: null, previous: null });
    await recordSync(
      { reviewId, planId: plan.id, figmaId: null, direction: "design-to-code", designSnapshot: first.designSnapshot, codeSnapshot: first.codeSnapshot, patch: first.patch, conflicts: first.conflicts, status: first.status },
      store
    );

    // Simulate the design changing (different wireframe payload) AND a hand-edited code override.
    const changedWireframe: WireframeRecord = {
      ...wireframe,
      content: { ...wireframe.content, layouts: wireframe.content.layouts.slice(0, wireframe.content.layouts.length - 1) },
    };

    const previous = await getLatestSyncForReview(reviewId, store);
    const result = computeSync({
      direction: "code-to-design",
      wireframe: changedWireframe,
      figma: null,
      previous,
      codeOverride: { theme: ":root { --primary: #ff0000; }" },
    });

    expect(result.status).toBe("conflict");
    expect(result.conflicts.length).toBeGreaterThan(0);

    const record = await recordSync(
      { reviewId, planId: plan.id, figmaId: null, direction: "code-to-design", designSnapshot: result.designSnapshot, codeSnapshot: result.codeSnapshot, patch: result.patch, conflicts: result.conflicts, status: result.status },
      store
    );

    expect(record.status).toBe("conflict");
    expect((await getSyncRecord(record.id, store))?.status).toBe("conflict");
  });

  it("rolling back after a conflict restores the last known-good (in_sync) version end-to-end", async () => {
    const first = computeSync({ direction: "design-to-code", wireframe, figma: null, previous: null });
    const goodRecord = await recordSync(
      { reviewId, planId: plan.id, figmaId: null, direction: "design-to-code", designSnapshot: first.designSnapshot, codeSnapshot: first.codeSnapshot, patch: first.patch, conflicts: first.conflicts, status: first.status },
      store
    );

    const changedWireframe: WireframeRecord = {
      ...wireframe,
      content: { ...wireframe.content, layouts: wireframe.content.layouts.slice(0, wireframe.content.layouts.length - 1) },
    };
    const conflicted = computeSync({
      direction: "code-to-design",
      wireframe: changedWireframe,
      figma: null,
      previous: await getLatestSyncForReview(reviewId, store),
      codeOverride: { theme: ":root { --primary: #ff0000; }" },
    });
    await recordSync(
      { reviewId, planId: plan.id, figmaId: null, direction: "code-to-design", designSnapshot: conflicted.designSnapshot, codeSnapshot: conflicted.codeSnapshot, patch: conflicted.patch, conflicts: conflicted.conflicts, status: conflicted.status },
      store
    );

    const rollback = await rollbackSyncRecord(goodRecord.id, 1, { actor: "designer@cnbiz.kr" }, store);

    expect(rollback.success).toBe(true);
    expect(rollback.record?.status).toBe("rolled_back");
    expect(rollback.record?.designSnapshot.hash).toBe(first.designSnapshot.hash);
    expect(rollback.record?.conflicts).toEqual([]);
    // full history (sync, conflict-sync, rollback) preserved
    expect(rollback.record?.history).toHaveLength(3);
  });
});
