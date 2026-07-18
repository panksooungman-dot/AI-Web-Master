import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getFigmaRecord,
  listFigmaRecords,
  listFigmaRecordsForReview,
  recordFigmaExport,
  recordFigmaImport,
  type FigmaContent,
} from "../../lib/design/figma";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultFigmaImportContent } from "../../lib/design/figma-generator";

const CONTENT: FigmaContent = buildDefaultFigmaImportContent("seed-file");

describe("Figma Registry — lib/design/figma.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "figma-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listFigmaRecords() returns an empty array before anything is recorded", async () => {
    expect(await listFigmaRecords(store)).toEqual([]);
  });

  it("recordFigmaImport() creates a new record (version 1) and persists to lib/data/design-figma.json", async () => {
    const record = await recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.version).toBe(1);
    expect(record.importHistory).toHaveLength(1);
    expect(record.importHistory[0].operation).toBe("import");
    expect(record.exportHistory).toHaveLength(0);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-figma.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
  });

  it("recordFigmaImport() called again for the same (reviewId, figmaFileId) updates the existing record instead of creating a new one", async () => {
    const first = await recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: true },
      store
    );
    const second = await recordFigmaImport(
      {
        reviewId: "review-1",
        planId: "plan-1",
        figmaFileId: "file-1",
        fileName: "My File (renamed)",
        content: CONTENT,
        simulated: false,
      },
      store
    );

    expect(second.id).toBe(first.id);
    expect(second.version).toBe(2);
    expect(second.fileName).toBe("My File (renamed)");
    expect(second.importHistory).toHaveLength(2);
    expect(await listFigmaRecords(store)).toHaveLength(1);
  });

  it("recordFigmaExport() on a record that only has import history appends to exportHistory and bumps version", async () => {
    await recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: true },
      store
    );
    const exported = await recordFigmaExport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: false },
      store
    );

    expect(exported.version).toBe(2);
    expect(exported.importHistory).toHaveLength(1);
    expect(exported.exportHistory).toHaveLength(1);
    expect(exported.exportHistory[0].operation).toBe("export");
    expect(exported.simulated).toBe(false);
  });

  it("a different figmaFileId for the same reviewId creates a separate record", async () => {
    await recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "File A", content: CONTENT, simulated: true },
      store
    );
    await recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-2", fileName: "File B", content: CONTENT, simulated: true },
      store
    );

    expect(await listFigmaRecords(store)).toHaveLength(2);
    expect(await listFigmaRecordsForReview("review-1", store)).toHaveLength(2);
  });

  it("getFigmaRecord() finds a record by id, null for unknown id", async () => {
    const record = await recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: true },
      store
    );

    expect((await getFigmaRecord(record.id, store))?.figmaFileId).toBe("file-1");
    expect(await getFigmaRecord("does-not-exist", store)).toBeNull();
  });

  it("listFigmaRecords() returns entries newest first", async () => {
    await recordFigmaImport(
      { reviewId: "review-a", planId: "plan-a", figmaFileId: "file-a", fileName: "A", content: CONTENT, simulated: true },
      store
    );
    await recordFigmaImport(
      { reviewId: "review-b", planId: "plan-b", figmaFileId: "file-b", fileName: "B", content: CONTENT, simulated: true },
      store
    );

    expect((await listFigmaRecords(store)).map((r) => r.reviewId)).toEqual(["review-b", "review-a"]);
  });

  it("listFigmaRecordsForReview() filters to only the given review's Figma files", async () => {
    await recordFigmaImport(
      { reviewId: "review-a", planId: "plan-a", figmaFileId: "file-a", fileName: "A", content: CONTENT, simulated: true },
      store
    );
    await recordFigmaImport(
      { reviewId: "review-b", planId: "plan-b", figmaFileId: "file-b", fileName: "B", content: CONTENT, simulated: true },
      store
    );

    expect(await listFigmaRecordsForReview("review-a", store)).toHaveLength(1);
    expect(await listFigmaRecordsForReview("review-c", store)).toHaveLength(0);
  });

  it("records the acting user on each history entry", async () => {
    const record = await recordFigmaImport(
      {
        reviewId: "review-1",
        planId: "plan-1",
        figmaFileId: "file-1",
        fileName: "My File",
        content: CONTENT,
        simulated: true,
        actor: "designer@cnbiz.kr",
      },
      store
    );

    expect(record.importHistory[0].actor).toBe("designer@cnbiz.kr");
  });
});
