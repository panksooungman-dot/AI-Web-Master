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

describe("Review Registry — lib/design/review-registry.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "review-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listReviews() returns an empty array before anything is created", () => {
    expect(listReviews(baseDir)).toEqual([]);
  });

  it("createReview() starts in_review with version 1, a seeded history entry, and persists to lib/data/design-reviews.json", () => {
    const record = createReview({ claudeDesignId: "cd-1", planId: "plan-1", actor: "alice@example.com" }, baseDir);

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

  it("createReview() auto-increments version per claudeDesignId, preserving history (no overwrite)", () => {
    const v1 = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const v2 = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const v3 = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(v3.version).toBe(3);
    expect(listReviewsForClaudeDesign("cd-1", baseDir)).toHaveLength(3);
    expect(v1.id).not.toBe(v2.id);
  });

  it("createReview() tracks version independently per claudeDesignId", () => {
    const aV1 = createReview({ claudeDesignId: "cd-a", planId: "plan-a" }, baseDir);
    const bV1 = createReview({ claudeDesignId: "cd-b", planId: "plan-b" }, baseDir);
    const aV2 = createReview({ claudeDesignId: "cd-a", planId: "plan-a" }, baseDir);

    expect(aV1.version).toBe(1);
    expect(bV1.version).toBe(1);
    expect(aV2.version).toBe(2);
  });

  it("getReview() finds a record by id, null for unknown id", () => {
    const record = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);

    expect(getReview(record.id, baseDir)?.claudeDesignId).toBe("cd-1");
    expect(getReview("does-not-exist", baseDir)).toBeNull();
  });

  it("listReviews() returns entries newest first", () => {
    createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    createReview({ claudeDesignId: "cd-other", planId: "plan-other" }, baseDir);

    const records = listReviews(baseDir);
    expect(records.map((r) => r.claudeDesignId)).toEqual(["cd-other", "cd-1"]);
  });

  it("listReviewsForClaudeDesign() filters to only the given claude design's reviews", () => {
    createReview({ claudeDesignId: "cd-a", planId: "plan-a" }, baseDir);
    createReview({ claudeDesignId: "cd-b", planId: "plan-b" }, baseDir);
    createReview({ claudeDesignId: "cd-a", planId: "plan-a" }, baseDir);

    expect(listReviewsForClaudeDesign("cd-a", baseDir)).toHaveLength(2);
    expect(listReviewsForClaudeDesign("cd-b", baseDir)).toHaveLength(1);
    expect(listReviewsForClaudeDesign("cd-c", baseDir)).toHaveLength(0);
  });

  it("addReviewComment() appends a comment and a matching history entry, bumping updatedAt", () => {
    const record = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const updated = addReviewComment(record.id, { author: "bob@example.com", text: "looks great" }, baseDir);

    expect(updated).not.toBeNull();
    expect(updated?.comments).toHaveLength(1);
    expect(updated?.comments[0].author).toBe("bob@example.com");
    expect(updated?.comments[0].text).toBe("looks great");
    expect(updated?.history).toHaveLength(2);
    expect(updated?.history[1].note).toContain("looks great");
    expect(updated?.updatedAt).not.toBe(record.createdAt);
  });

  it("addReviewComment() returns null for an unknown review id", () => {
    expect(addReviewComment("does-not-exist", { author: "x", text: "y" }, baseDir)).toBeNull();
  });

  it("transitionReviewStatus() changes status and appends a history entry", () => {
    const record = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const updated = transitionReviewStatus(
      record.id,
      "approved",
      { actor: "carol@example.com", note: "ship it" },
      baseDir
    );

    expect(updated?.status).toBe("approved");
    expect(updated?.history).toHaveLength(2);
    expect(updated?.history[1].status).toBe("approved");
    expect(updated?.history[1].actor).toBe("carol@example.com");
    expect(updated?.history[1].note).toBe("ship it");
  });

  it("transitionReviewStatus() returns null for an unknown review id", () => {
    expect(transitionReviewStatus("does-not-exist", "approved", {}, baseDir)).toBeNull();
  });

  it("archiveReview() sets status to archived and records a note", () => {
    const record = createReview({ claudeDesignId: "cd-1", planId: "plan-1" }, baseDir);
    const archived = archiveReview(record.id, { actor: "dave@example.com" }, baseDir);

    expect(archived?.status).toBe("archived");
    expect(archived?.history[1].note).toBe("보관 처리");
  });

  it("preserves full history across multiple transitions and comments in chronological order", () => {
    const record = createReview({ claudeDesignId: "cd-1", planId: "plan-1", actor: "alice" }, baseDir);
    addReviewComment(record.id, { author: "bob", text: "first pass" }, baseDir);
    transitionReviewStatus(record.id, "revision_requested", { actor: "alice", note: "needs tweaks" }, baseDir);
    addReviewComment(record.id, { author: "bob", text: "updated" }, baseDir);
    const final = transitionReviewStatus(record.id, "approved", { actor: "alice" }, baseDir);

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
