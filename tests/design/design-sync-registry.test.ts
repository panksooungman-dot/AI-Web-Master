import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getLatestSyncForReview,
  getSyncRecord,
  listSyncRecords,
  listSyncRecordsForReview,
  recordSync,
  rollbackSyncRecord,
  type CodeSnapshot,
  type DesignSnapshot,
} from "../../lib/design/design-sync";

const DESIGN_SNAPSHOT: DesignSnapshot = {
  screens: ["홈"],
  components: ["Header", "Footer"],
  tokens: [{ name: "Primary", value: "#005BAC" }],
  hash: "design-hash-1",
};

const CODE_SNAPSHOT: CodeSnapshot = {
  components: [
    { name: "Header", file: "components/Header.tsx", code: "// header v1" },
    { name: "Footer", file: "components/Footer.tsx", code: "// footer v1" },
  ],
  theme: ":root { --primary: #005BAC; }",
  hash: "code-hash-1",
};

describe("Design Sync Registry — lib/design/design-sync.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-sync-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listSyncRecords() returns an empty array before anything is recorded", () => {
    expect(listSyncRecords(baseDir)).toEqual([]);
  });

  it("recordSync() creates a new record (version 1) and persists to lib/data/design-sync.json", () => {
    const record = recordSync(
      {
        reviewId: "review-1",
        planId: "plan-1",
        figmaId: "figma-1",
        direction: "design-to-code",
        designSnapshot: DESIGN_SNAPSHOT,
        codeSnapshot: CODE_SNAPSHOT,
        patch: [],
        conflicts: [],
        status: "in_sync",
      },
      baseDir
    );

    expect(record.id).toBeTruthy();
    expect(record.version).toBe(1);
    expect(record.history).toHaveLength(1);
    expect(record.history[0].action).toBe("sync");

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-sync.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
  });

  it("recordSync() called again for the same reviewId updates the existing record (version+1) instead of creating a new one", () => {
    const first = recordSync(
      { reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" },
      baseDir
    );
    const second = recordSync(
      { reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "code-to-design", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "conflict" },
      baseDir
    );

    expect(second.id).toBe(first.id);
    expect(second.version).toBe(2);
    expect(second.status).toBe("conflict");
    expect(second.history).toHaveLength(2);
    expect(listSyncRecords(baseDir)).toHaveLength(1);
  });

  it("a different reviewId creates a separate record", () => {
    recordSync({ reviewId: "review-a", planId: "plan-a", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, baseDir);
    recordSync({ reviewId: "review-b", planId: "plan-b", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, baseDir);

    expect(listSyncRecords(baseDir)).toHaveLength(2);
    expect(listSyncRecordsForReview("review-a", baseDir)).toHaveLength(1);
  });

  it("getLatestSyncForReview() returns null when nothing has been synced for that review", () => {
    expect(getLatestSyncForReview("does-not-exist", baseDir)).toBeNull();
  });

  it("getSyncRecord() finds a record by id, null for unknown id", () => {
    const record = recordSync({ reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, baseDir);
    expect(getSyncRecord(record.id, baseDir)?.reviewId).toBe("review-1");
    expect(getSyncRecord("does-not-exist", baseDir)).toBeNull();
  });

  it("rollbackSyncRecord() restores a past version's snapshots and appends a new history entry instead of deleting history", () => {
    const first = recordSync({ reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, baseDir);

    const changedDesign: DesignSnapshot = { ...DESIGN_SNAPSHOT, hash: "design-hash-2" };
    const changedCode: CodeSnapshot = { ...CODE_SNAPSHOT, hash: "code-hash-2" };
    recordSync({ reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: changedDesign, codeSnapshot: changedCode, patch: [], conflicts: [], status: "in_sync" }, baseDir);

    const result = rollbackSyncRecord(first.id, 1, { actor: "designer@cnbiz.kr" }, baseDir);

    expect(result.success).toBe(true);
    expect(result.record?.version).toBe(3);
    expect(result.record?.status).toBe("rolled_back");
    expect(result.record?.designSnapshot.hash).toBe("design-hash-1");
    expect(result.record?.history).toHaveLength(3);
    expect(result.record?.history[2].action).toBe("rollback");
    expect(result.record?.history[2].actor).toBe("designer@cnbiz.kr");
    // history is append-only — the original 2 entries are still intact
    expect(result.record?.history[0].designSnapshot.hash).toBe("design-hash-1");
    expect(result.record?.history[1].designSnapshot.hash).toBe("design-hash-2");
  });

  it("rollbackSyncRecord() returns not_found for an unknown sync id", () => {
    const result = rollbackSyncRecord("does-not-exist", 1, {}, baseDir);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("not_found");
  });

  it("rollbackSyncRecord() returns version_not_found for a version that never existed", () => {
    const record = recordSync({ reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, baseDir);
    const result = rollbackSyncRecord(record.id, 99, {}, baseDir);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("version_not_found");
  });
});
