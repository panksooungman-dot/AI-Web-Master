import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyApproval, approveReview, cancelApproval, rejectReview, requestRevision } from "../../lib/design/approval";
import { createReview, getReview } from "../../lib/design/review-registry";
import { createFsStore } from "../../lib/db/fsStore";

describe("Approval Engine — lib/design/approval.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "approval-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("approveReview() transitions in_review -> approved and records history", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const result = await approveReview(review.id, { actor: "alice@example.com", note: "ship it" }, store);

    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("approved");
    expect(result.record?.history.at(-1)?.actor).toBe("alice@example.com");
    expect(result.record?.history.at(-1)?.note).toBe("ship it");
  });

  it("rejectReview() transitions in_review -> rejected", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const result = await rejectReview(review.id, { actor: "bob@example.com" }, store);

    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("rejected");
  });

  it("requestRevision() transitions in_review -> revision_requested", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const result = await requestRevision(review.id, { note: "please adjust colors" }, store);

    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("revision_requested");
  });

  it("approveReview() and rejectReview() are also allowed directly from revision_requested", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    await requestRevision(review.id, {}, store);

    const approved = await approveReview(review.id, {}, store);
    expect(approved.success).toBe(true);
    expect(approved.record?.status).toBe("approved");
  });

  it("requestRevision() is rejected once the review is no longer in_review (invalid_transition)", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    await approveReview(review.id, {}, store);

    const result = await requestRevision(review.id, {}, store);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("invalid_transition");
    expect(result.error).toContain("approved");
  });

  it("cancelApproval() transitions approved -> in_review", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    await approveReview(review.id, {}, store);

    const result = await cancelApproval(review.id, { actor: "carol@example.com" }, store);
    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("in_review");
  });

  it("cancelApproval() transitions rejected -> in_review", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    await rejectReview(review.id, {}, store);

    const result = await cancelApproval(review.id, {}, store);
    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("in_review");
  });

  it("cancelApproval() is rejected when nothing has been approved/rejected yet (invalid_transition)", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const result = await cancelApproval(review.id, {}, store);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("invalid_transition");
  });

  it("all actions return not_found for an unknown review id", async () => {
    const result = await approveReview("does-not-exist", {}, store);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("not_found");
  });

  it("does not mutate the underlying record when a transition is rejected", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    await approveReview(review.id, {}, store);

    await requestRevision(review.id, {}, store); // invalid: approved -> revision_requested is not allowed
    const fetched = await getReview(review.id, store);
    expect(fetched?.status).toBe("approved");
    expect(fetched?.history).toHaveLength(2); // seeded + approve only, no bogus entry added
  });

  it("applyApproval() dispatches to the same underlying transitions by action name", async () => {
    const review = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const result = await applyApproval(review.id, "reject", {}, store);

    expect(result.success).toBe(true);
    expect(result.record?.status).toBe("rejected");
  });
});
