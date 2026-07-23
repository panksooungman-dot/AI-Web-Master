import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
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
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-sync-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listSyncRecords() returns an empty array before anything is recorded", async () => {
    expect(await listSyncRecords(store)).toEqual([]);
  });

  it("recordSync() creates a new record (version 1) and persists it", async () => {
    const record = await recordSync(
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
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.version).toBe(1);
    expect(record.history).toHaveLength(1);
    expect(record.history[0].action).toBe("sync");

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-sync.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
  });

  it("recordSync() called again for the same reviewId updates the existing record (version+1) instead of creating a new one", async () => {
    const first = await recordSync(
      { reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" },
      store
    );
    const second = await recordSync(
      { reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "code-to-design", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "conflict" },
      store
    );

    expect(second.id).toBe(first.id);
    expect(second.version).toBe(2);
    expect(second.status).toBe("conflict");
    expect(second.history).toHaveLength(2);
    expect(await listSyncRecords(store)).toHaveLength(1);
  });

  it("a different reviewId creates a separate record", async () => {
    await recordSync({ reviewId: "review-a", planId: "plan-a", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, store);
    await recordSync({ reviewId: "review-b", planId: "plan-b", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, store);

    expect(await listSyncRecords(store)).toHaveLength(2);
    expect(await listSyncRecordsForReview("review-a", store)).toHaveLength(1);
  });

  it("getLatestSyncForReview() returns null when nothing has been synced for that review", async () => {
    expect(await getLatestSyncForReview("does-not-exist", store)).toBeNull();
  });

  it("getSyncRecord() finds a record by id, null for unknown id", async () => {
    const record = await recordSync({ reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, store);
    expect((await getSyncRecord(record.id, store))?.reviewId).toBe("review-1");
    expect(await getSyncRecord("does-not-exist", store)).toBeNull();
  });

  it("rollbackSyncRecord() restores a past version's snapshots and appends a new history entry instead of deleting history", async () => {
    const first = await recordSync({ reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, store);

    const changedDesign: DesignSnapshot = { ...DESIGN_SNAPSHOT, hash: "design-hash-2" };
    const changedCode: CodeSnapshot = { ...CODE_SNAPSHOT, hash: "code-hash-2" };
    await recordSync({ reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: changedDesign, codeSnapshot: changedCode, patch: [], conflicts: [], status: "in_sync" }, store);

    const result = await rollbackSyncRecord(first.id, 1, { actor: "designer@cnbiz.kr" }, store);

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

  it("rollbackSyncRecord() returns not_found for an unknown sync id", async () => {
    const result = await rollbackSyncRecord("does-not-exist", 1, {}, store);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("not_found");
  });

  it("rollbackSyncRecord() returns version_not_found for a version that never existed", async () => {
    const record = await recordSync({ reviewId: "review-1", planId: "plan-1", figmaId: null, direction: "design-to-code", designSnapshot: DESIGN_SNAPSHOT, codeSnapshot: CODE_SNAPSHOT, patch: [], conflicts: [], status: "in_sync" }, store);
    const result = await rollbackSyncRecord(record.id, 99, {}, store);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("version_not_found");
  });
});
