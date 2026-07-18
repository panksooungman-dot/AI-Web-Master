import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportFigmaFile, importFigmaFile } from "../../lib/design/figma-generator";
import { recordFigmaExport, recordFigmaImport, listFigmaRecordsForReview, getFigmaRecord } from "../../lib/design/figma";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import { buildDefaultClaudeDesign } from "../../lib/design/claude-design-generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { PrototypeRecord } from "../../lib/design/prototype";
import type { ClaudeDesignRecord } from "../../lib/design/claude-design";
import type { ReviewRecord, ReviewStatus } from "../../lib/design/review";

/**
 * Integration coverage for Design Automation Phase 7 (Figma Import/Export), mirroring
 * tests/design/claude-design-integration.test.ts's approach for Phase 5.
 *
 * As with Phase 1-6, a route-handler-level integration test (constructing a Request and calling
 * app/api/design/figma/{import,export}/route.ts's POST directly) does NOT work in this repo:
 * those routes call getCurrentActorEmail() → next/headers's cookies(), which throws outside the
 * Next.js request-handling runtime. This file integration-tests the layer directly beneath the
 * routes (generator + registry, real filesystem I/O) and replicates the routes' Approval Rule
 * check (`review.status !== "approved"` → reject) as a plain assertion, since that check is a
 * single inline equality in the route itself, verified end-to-end via curl/Playwright separately.
 */
describe("Design Automation Phase 7 — figma generator + registry integration", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  const planInput: DesignPlanInput = {
    projectName: "Northfield Clinic",
    projectType: "hospital",
    requirements: "진료 예약, 진료과 소개, 오시는 길 안내가 필요합니다.",
    targetUsers: "지역 주민",
  };

  const plan: DesignPlanRecord = {
    id: "design-plan-northfield",
    input: planInput,
    content: buildDefaultDesignPlan(planInput),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const storyboard: StoryboardRecord = {
    id: "storyboard-northfield",
    planId: plan.id,
    content: buildDefaultStoryboard(plan),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const wireframe: WireframeRecord = {
    id: "wireframe-northfield",
    storyboardId: storyboard.id,
    planId: plan.id,
    content: buildDefaultWireframe(storyboard),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const prototype: PrototypeRecord = {
    id: "prototype-northfield",
    wireframeId: wireframe.id,
    planId: plan.id,
    version: 1,
    content: buildDefaultPrototype(wireframe),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const claudeDesign: ClaudeDesignRecord = {
    id: "claude-design-northfield",
    prototypeId: prototype.id,
    planId: plan.id,
    content: buildDefaultClaudeDesign(prototype),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  function buildReview(status: ReviewStatus): ReviewRecord {
    return {
      id: "review-northfield",
      claudeDesignId: claudeDesign.id,
      planId: plan.id,
      version: 1,
      status,
      comments: [],
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /** app/api/design/figma/export/route.ts의 Approval Rule을 그대로 재현한다(요구사항 5번). */
  function assertExportAllowed(review: ReviewRecord): void {
    if (review.status !== "approved") {
      throw new Error(`Export requires an approved review (current status: "${review.status}")`);
    }
  }

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "figma-integration-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("imports a Figma file for a review (no approval required) and persists it end-to-end", async () => {
    const review = buildReview("in_review");
    const { content, fileName, simulated } = await importFigmaFile({ figmaFileId: "figma-abc", fileName: "Reference" });

    const record = await recordFigmaImport(
      { reviewId: review.id, planId: review.planId, figmaFileId: "figma-abc", fileName, content, simulated },
      store
    );

    expect(simulated).toBe(true); // no FIGMA_API_TOKEN in this environment
    expect((await getFigmaRecord(record.id, store))?.reviewId).toBe(review.id);
    expect(await listFigmaRecordsForReview(review.id, store)).toHaveLength(1);
  });

  it("rejects export for a non-approved review before ever calling the generator (Approval Rule)", () => {
    const review = buildReview("in_review");
    expect(() => assertExportAllowed(review)).toThrow(/approved/i);
  });

  it("exports the approved design chain (Wireframe → Prototype → Claude Design) into Figma structure and persists it", async () => {
    const review = buildReview("approved");
    assertExportAllowed(review); // does not throw

    const { content, simulated } = await exportFigmaFile({
      figmaFileId: `figma-export-${review.id}`,
      wireframe,
      prototype,
      claudeDesign,
    });

    const record = await recordFigmaExport(
      {
        reviewId: review.id,
        planId: review.planId,
        figmaFileId: `figma-export-${review.id}`,
        fileName: `Figma Export — ${review.planId}`,
        content,
        simulated,
      },
      store
    );

    expect(record.content.pages).toHaveLength(wireframe.content.layouts.length);
    expect(record.content.tokens.length).toBeGreaterThan(0);
    expect(record.exportHistory).toHaveLength(1);

    const fetched = await getFigmaRecord(record.id, store);
    expect(fetched?.planId).toBe(plan.id);
  });

  it("importing then exporting the same (reviewId, figmaFileId) accumulates history on a single record", async () => {
    const review = buildReview("approved");
    const figmaFileId = "figma-combo";

    const imported = await importFigmaFile({ figmaFileId });
    const afterImport = await recordFigmaImport(
      { reviewId: review.id, planId: review.planId, figmaFileId, fileName: imported.fileName, content: imported.content, simulated: imported.simulated },
      store
    );
    expect(afterImport.version).toBe(1);

    const exported = await exportFigmaFile({ figmaFileId, wireframe, prototype, claudeDesign });
    const afterExport = await recordFigmaExport(
      { reviewId: review.id, planId: review.planId, figmaFileId, fileName: afterImport.fileName, content: exported.content, simulated: exported.simulated },
      store
    );

    expect(afterExport.id).toBe(afterImport.id);
    expect(afterExport.version).toBe(2);
    expect(afterExport.importHistory).toHaveLength(1);
    expect(afterExport.exportHistory).toHaveLength(1);
  });

  /**
   * The one genuinely end-to-end test: exercises the REAL default fetch (global `fetch`, no
   * dependency injection) — since no `FIGMA_API_TOKEN` is configured in this environment, the
   * real code path for "no token" is taken and `fetch` is never actually invoked, deterministically
   * returning the fallback content. This proves the real (non-mocked) function behaves safely
   * with zero network access, mirroring how other phases prove their real-CLI fallback path.
   */
  it("[real fetch] falls back to deterministic import content end-to-end when FIGMA_API_TOKEN is not configured", async () => {
    const result = await importFigmaFile({ figmaFileId: "real-fetch-file" });
    expect(result.simulated).toBe(true);
    expect(result.content.pages.length).toBeGreaterThan(0);
  });
});
