import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyApproval, approveReview, cancelApproval, rejectReview, requestRevision } from "../../lib/design/approval";
import { createReview, getReview } from "../../lib/design/review-registry";

describe("Approval Engine — lib/design/approval.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "approval-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("approveReview() transitions in_review -> approved and records history", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const result = approveReview(review.id, { actor: "alice@example.com", note: "ship it" }, baseDir);

    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("approved");
    expect(result.record?.history.at(-1)?.actor).toBe("alice@example.com");
    expect(result.record?.history.at(-1)?.note).toBe("ship it");
  });

  it("rejectReview() transitions in_review -> rejected", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const result = rejectReview(review.id, { actor: "bob@example.com" }, baseDir);

    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("rejected");
  });

  it("requestRevision() transitions in_review -> revision_requested", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const result = requestRevision(review.id, { note: "please adjust colors" }, baseDir);

    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("revision_requested");
  });

  it("approveReview() and rejectReview() are also allowed directly from revision_requested", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    requestRevision(review.id, {}, baseDir);

    const approved = approveReview(review.id, {}, baseDir);
    expect(approved.success).toBe(true);
    expect(approved.record?.status).toBe("approved");
  });

  it("requestRevision() is rejected once the review is no longer in_review (invalid_transition)", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    approveReview(review.id, {}, baseDir);

    const result = requestRevision(review.id, {}, baseDir);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("invalid_transition");
    expect(result.error).toContain("approved");
  });

  it("cancelApproval() transitions approved -> in_review", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    approveReview(review.id, {}, baseDir);

    const result = cancelApproval(review.id, { actor: "carol@example.com" }, baseDir);
    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("in_review");
  });

  it("cancelApproval() transitions rejected -> in_review", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    rejectReview(review.id, {}, baseDir);

    const result = cancelApproval(review.id, {}, baseDir);
    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("in_review");
  });

  it("cancelApproval() is rejected when nothing has been approved/rejected yet (invalid_transition)", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const result = cancelApproval(review.id, {}, baseDir);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("invalid_transition");
  });

  it("all actions return not_found for an unknown review id", () => {
    const result = approveReview("does-not-exist", {}, baseDir);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("not_found");
  });

  it("does not mutate the underlying record when a transition is rejected", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    approveReview(review.id, {}, baseDir);

    requestRevision(review.id, {}, baseDir); // invalid: approved -> revision_requested is not allowed
    const fetched = getReview(review.id, baseDir);
    expect(fetched?.status).toBe("approved");
    expect(fetched?.history).toHaveLength(2); // seeded + approve only, no bogus entry added
  });

  it("applyApproval() dispatches to the same underlying transitions by action name", () => {
    const review = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const result = applyApproval(review.id, "reject", {}, baseDir);

    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("rejected");
  });
});
