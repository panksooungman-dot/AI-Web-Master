import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { approveReview, cancelApproval, rejectReview, requestRevision } from "../../lib/design/approval";
import {
  addReviewComment,
  archiveReview,
  createReview,
  getReview,
  listReviews,
  listReviewsForClaudeDesign,
} from "../../lib/design/review-registry";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultClaudeDesign } from "../../lib/design/claude-design-generator";
import { createClaudeDesign } from "../../lib/design/claude-design";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { PrototypeRecord } from "../../lib/design/prototype";

/**
 * Integration coverage for Design Automation Phase 6 (Customer Review & Approval), mirroring
 * tests/design/claude-design-integration.test.ts's approach for Phase 5. Unlike Phase 1-5,
 * this phase has no AI provider call (pure state machine on top of an existing ClaudeDesignRecord),
 * so there is no "[real CLI]" fallback test — the whole surface is deterministic.
 *
 * As with Phase 1-5, a route-handler-level integration test (constructing a Request and calling
 * app/api/design/review/route.ts's POST directly) does NOT work in this repo: that route calls
 * getCurrentActorEmail() → next/headers's cookies(), which throws "cookies was called outside a
 * request scope" unless actually running inside the Next.js server request-handling runtime.
 * Verified against the real dev server via manual curl/Playwright E2E instead. This file
 * integration-tests the layer directly beneath the routes: review-registry + approval working
 * together for real (real filesystem I/O) against a full Phase 1-5 chain.
 */
describe("Design Automation Phase 6 — review registry + approval integration", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  const planInput: DesignPlanInput = {
    projectName: "Riverside Cafe",
    projectType: "restaurant",
    requirements: "메뉴 소개, 예약, 오시는 길 안내가 필요합니다.",
    targetUsers: "지역 주민",
  };

  const plan: DesignPlanRecord = {
    id: "design-plan-riverside",
    input: planInput,
    content: buildDefaultDesignPlan(planInput),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const storyboard: StoryboardRecord = {
    id: "storyboard-riverside",
    planId: plan.id,
    content: buildDefaultStoryboard(plan),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const wireframe: WireframeRecord = {
    id: "wireframe-riverside",
    storyboardId: storyboard.id,
    planId: plan.id,
    content: buildDefaultWireframe(storyboard),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  const prototype: PrototypeRecord = {
    id: "prototype-riverside",
    wireframeId: wireframe.id,
    planId: plan.id,
    version: 1,
    content: buildDefaultPrototype(wireframe),
    simulated: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "review-integration-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("creates a review against a real ClaudeDesignRecord and persists/retrieves it end-to-end", async () => {
    const claudeDesign = await createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      store
    );

    const review = await createReview({ claudeDesignId: claudeDesign.id, planId: claudeDesign.planId, actor: "alice@example.com" }, store);

    const fetched = await getReview(review.id, store);
    expect(fetched).not.toBeNull();
    expect(fetched?.claudeDesignId).toBe(claudeDesign.id);
    expect(fetched?.planId).toBe(plan.id);
    expect(fetched?.status).toBe("in_review");
    expect(fetched?.version).toBe(1);

    const listed = await listReviews(store);
    expect(listed).toHaveLength(1);

    const forClaudeDesign = await listReviewsForClaudeDesign(claudeDesign.id, store);
    expect(forClaudeDesign).toHaveLength(1);
  });

  it("runs a full review lifecycle: comment -> revision -> approve -> cancel -> reject -> archive, preserving full history", async () => {
    const claudeDesign = await createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      store
    );
    const review = await createReview({ claudeDesignId: claudeDesign.id, planId: claudeDesign.planId, actor: "alice@example.com" }, store);

    const afterComment = await addReviewComment(review.id, { author: "bob@example.com", text: "화면이 잘 나왔네요" }, store);
    expect(afterComment?.comments).toHaveLength(1);

    const afterRevision = await requestRevision(review.id, { actor: "alice@example.com", note: "버튼 색을 조정해주세요" }, store);
    expect(afterRevision.success).toBe(true);
    expect(afterRevision.record?.status).toBe("revision_requested");

    const afterApprove = await approveReview(review.id, { actor: "alice@example.com" }, store);
    expect(afterApprove.success).toBe(true);
    expect(afterApprove.record?.status).toBe("approved");

    const afterCancel = await cancelApproval(review.id, { actor: "alice@example.com", note: "다시 검토가 필요합니다" }, store);
    expect(afterCancel.success).toBe(true);
    expect(afterCancel.record?.status).toBe("in_review");

    const afterReject = await rejectReview(review.id, { actor: "alice@example.com" }, store);
    expect(afterReject.success).toBe(true);
    expect(afterReject.record?.status).toBe("rejected");

    const archived = await archiveReview(review.id, { actor: "alice@example.com" }, store);
    expect(archived?.status).toBe("archived");

    const final = await getReview(review.id, store);
    expect(final?.comments).toHaveLength(1);
    expect(final?.history.map((h) => h.status)).toEqual([
      "in_review",
      "in_review", // seeded from creation, comment adds a history entry stamped with the current status
      "revision_requested",
      "approved",
      "in_review",
      "rejected",
      "archived",
    ]);
  });

  it("regenerating a review for the same Claude Design creates a new version rather than overwriting", async () => {
    const claudeDesign = await createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      store
    );

    const v1 = await createReview({ claudeDesignId: claudeDesign.id, planId: claudeDesign.planId }, store);
    const v2 = await createReview({ claudeDesignId: claudeDesign.id, planId: claudeDesign.planId }, store);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(await listReviewsForClaudeDesign(claudeDesign.id, store)).toHaveLength(2);
  });

  it("keeps reviews from multiple Claude Design outputs independent in the same registry", async () => {
    const claudeDesignA = await createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      store
    );
    const claudeDesignB = await createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      store
    );

    await createReview({ claudeDesignId: claudeDesignA.id, planId: claudeDesignA.planId }, store);
    await createReview({ claudeDesignId: claudeDesignB.id, planId: claudeDesignB.planId }, store);

    expect(await listReviewsForClaudeDesign(claudeDesignA.id, store)).toHaveLength(1);
    expect(await listReviewsForClaudeDesign(claudeDesignB.id, store)).toHaveLength(1);
    expect(await listReviews(store)).toHaveLength(2);
  });
});
