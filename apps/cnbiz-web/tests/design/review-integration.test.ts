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
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("creates a review against a real ClaudeDesignRecord and persists/retrieves it end-to-end", () => {
    const claudeDesign = createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      baseDir
    );

    const review = createReview({ claudeDesignId: claudeDesign.id, planId: claudeDesign.planId, actor: "alice@example.com" }, baseDir);

    const fetched = getReview(review.id, baseDir);
    expect(fetched).not.toBeNull();
    expect(fetched?.claudeDesignId).toBe(claudeDesign.id);
    expect(fetched?.planId).toBe(plan.id);
    expect(fetched?.status).toBe("in_review");
    expect(fetched?.version).toBe(1);

    const listed = listReviews(baseDir);
    expect(listed).toHaveLength(1);

    const forClaudeDesign = listReviewsForClaudeDesign(claudeDesign.id, baseDir);
    expect(forClaudeDesign).toHaveLength(1);
  });

  it("runs a full review lifecycle: comment -> revision -> approve -> cancel -> reject -> archive, preserving full history", () => {
    const claudeDesign = createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      baseDir
    );
    const review = createReview({ claudeDesignId: claudeDesign.id, planId: claudeDesign.planId, actor: "alice@example.com" }, baseDir);

    const afterComment = addReviewComment(review.id, { author: "bob@example.com", text: "화면이 잘 나왔네요" }, baseDir);
    expect(afterComment?.comments).toHaveLength(1);

    const afterRevision = requestRevision(review.id, { actor: "alice@example.com", note: "버튼 색을 조정해주세요" }, baseDir);
    expect(afterRevision.success).toBe(true);
    expect(afterRevision.record?.status).toBe("revision_requested");

    const afterApprove = approveReview(review.id, { actor: "alice@example.com" }, baseDir);
    expect(afterApprove.success).toBe(true);
    expect(afterApprove.record?.status).toBe("approved");

    const afterCancel = cancelApproval(review.id, { actor: "alice@example.com", note: "다시 검토가 필요합니다" }, baseDir);
    expect(afterCancel.success).toBe(true);
    expect(afterCancel.record?.status).toBe("in_review");

    const afterReject = rejectReview(review.id, { actor: "alice@example.com" }, baseDir);
    expect(afterReject.success).toBe(true);
    expect(afterReject.record?.status).toBe("rejected");

    const archived = archiveReview(review.id, { actor: "alice@example.com" }, baseDir);
    expect(archived?.status).toBe("archived");

    const final = getReview(review.id, baseDir);
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

  it("regenerating a review for the same Claude Design creates a new version rather than overwriting", () => {
    const claudeDesign = createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      baseDir
    );

    const v1 = createReview({ claudeDesignId: claudeDesign.id, planId: claudeDesign.planId }, baseDir);
    const v2 = createReview({ claudeDesignId: claudeDesign.id, planId: claudeDesign.planId }, baseDir);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(listReviewsForClaudeDesign(claudeDesign.id, baseDir)).toHaveLength(2);
  });

  it("keeps reviews from multiple Claude Design outputs independent in the same registry", () => {
    const claudeDesignA = createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      baseDir
    );
    const claudeDesignB = createClaudeDesign(
      { prototypeId: prototype.id, planId: prototype.planId, content: buildDefaultClaudeDesign(prototype), simulated: true },
      baseDir
    );

    createReview({ claudeDesignId: claudeDesignA.id, planId: claudeDesignA.planId }, baseDir);
    createReview({ claudeDesignId: claudeDesignB.id, planId: claudeDesignB.planId }, baseDir);

    expect(listReviewsForClaudeDesign(claudeDesignA.id, baseDir)).toHaveLength(1);
    expect(listReviewsForClaudeDesign(claudeDesignB.id, baseDir)).toHaveLength(1);
    expect(listReviews(baseDir)).toHaveLength(2);
  });
});
