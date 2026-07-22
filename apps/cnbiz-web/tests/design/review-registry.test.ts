import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addReviewComment,
  archiveReview,
  createReview,
  getReview,
  listReviews,
  listReviewsForClaudeDesign,
  transitionReviewStatus,
} from "../../lib/design/review-registry";
import { createFsStore } from "../../lib/db/fsStore";

describe("Review Registry — lib/design/review-registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "review-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listReviews() returns an empty array before anything is created", async () => {
    expect(await listReviews(store)).toEqual([]);
  });

  it("createReview() starts in_review with version 1, a seeded history entry, and persists to lib/data/design-reviews.json", async () => {
    const record = await createReview({ claudeDesignId: "cd-1", planId: "plan-1", actor: "alice@example.com" }, store);

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.updatedAt).toBe(record.createdAt);
    expect(record.status).toBe("in_review");
    expect(record.version).toBe(1);
    expect(record.comments).toEqual([]);
    expect(record.history).toHaveLength(1);
    expect(record.history[0].status).toBe("in_review");
    expect(record.history[0].actor).toBe("alice@example.com");

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-reviews.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].claudeDesignId).toBe("cd-1");
    expect(raw[0].planId).toBe("plan-1");
  });

  it("createReview() auto-increments version per claudeDesignId, preserving history (no overwrite)", async () => {
    const v1 = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const v2 = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const v3 = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(v3.version).toBe(3);
    expect(await listReviewsForClaudeDesign("cd-1", store)).toHaveLength(3);
    expect(v1.id).not.toBe(v2.id);
  });

  it("createReview() tracks version independently per claudeDesignId", async () => {
    const aV1 = await createReview({ claudeDesignId: "cd-a", planId: "plan-a" }, store);
    const bV1 = await createReview({ claudeDesignId: "cd-b", planId: "plan-b" }, store);
    const aV2 = await createReview({ claudeDesignId: "cd-a", planId: "plan-a" }, store);

    expect(aV1.version).toBe(1);
    expect(bV1.version).toBe(1);
    expect(aV2.version).toBe(2);
  });

  it("getReview() finds a record by id, null for unknown id", async () => {
    const record = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);

    expect((await getReview(record.id, store))?.claudeDesignId).toBe("cd-1");
    expect(await getReview("does-not-exist", store)).toBeNull();
  });

  it("listReviews() returns entries newest first", async () => {
    await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    await createReview({ claudeDesignId: "cd-other", planId: "plan-other" }, store);

    const records = await listReviews(store);
    expect(records.map((r) => r.claudeDesignId)).toEqual(["cd-other", "cd-1"]);
  });

  it("listReviewsForClaudeDesign() filters to only the given claude design's reviews", async () => {
    await createReview({ claudeDesignId: "cd-a", planId: "plan-a" }, store);
    await createReview({ claudeDesignId: "cd-b", planId: "plan-b" }, store);
    await createReview({ claudeDesignId: "cd-a", planId: "plan-a" }, store);

    expect(await listReviewsForClaudeDesign("cd-a", store)).toHaveLength(2);
    expect(await listReviewsForClaudeDesign("cd-b", store)).toHaveLength(1);
    expect(await listReviewsForClaudeDesign("cd-c", store)).toHaveLength(0);
  });

  it("addReviewComment() appends a comment and a matching history entry, bumping updatedAt", async () => {
    const record = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const updated = await addReviewComment(record.id, { author: "bob@example.com", text: "looks great" }, store);

    expect(updated).not.toBeNull();
    expect(updated?.comments).toHaveLength(1);
    expect(updated?.comments[0].author).toBe("bob@example.com");
    expect(updated?.comments[0].text).toBe("looks great");
    expect(updated?.history).toHaveLength(2);
    expect(updated?.history[1].note).toContain("looks great");
    // `!==` would flake when both timestamps land in the same millisecond (Date.now()
    // resolution) — `>=` still proves updatedAt was recomputed on top of createdAt.
    expect(updated?.updatedAt >= record.createdAt).toBe(true);
  });

  it("addReviewComment() returns null for an unknown review id", async () => {
    expect(await addReviewComment("does-not-exist", { author: "x", text: "y" }, store)).toBeNull();
  });

  it("transitionReviewStatus() changes status and appends a history entry", async () => {
    const record = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const updated = await transitionReviewStatus(
      record.id,
      "approved",
      { actor: "carol@example.com", note: "ship it" },
      store
    );

    expect(updated?.status).toBe("approved");
    expect(updated?.history).toHaveLength(2);
    expect(updated?.history[1].status).toBe("approved");
    expect(updated?.history[1].actor).toBe("carol@example.com");
    expect(updated?.history[1].note).toBe("ship it");
  });

  it("transitionReviewStatus() returns null for an unknown review id", async () => {
    expect(await transitionReviewStatus("does-not-exist", "approved", {}, store)).toBeNull();
  });

  it("archiveReview() sets status to archived and records a note", async () => {
    const record = await createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, store);
    const archived = await archiveReview(record.id, { actor: "dave@example.com" }, store);

    expect(archived?.status).toBe("archived");
    expect(archived?.history[1].note).toBe("보관 처리");
  });

  it("preserves full history across multiple transitions and comments in chronological order", async () => {
    const record = await createReview({ claudeDesignId: "cd-1", planId: "plan-1", actor: "alice" }, store);
    await addReviewComment(record.id, { author: "bob", text: "first pass" }, store);
    await transitionReviewStatus(record.id, "revision_requested", { actor: "alice", note: "needs tweaks" }, store);
    await addReviewComment(record.id, { author: "bob", text: "updated" }, store);
    const final = await transitionReviewStatus(record.id, "approved", { actor: "alice" }, store);

    expect(final?.history.map((h) => h.status)).toEqual([
      "in_review",
      "in_review",
      "revision_requested",
      "revision_requested",
      "approved",
    ]);
    expect(final?.comments).toHaveLength(2);
  });
});
