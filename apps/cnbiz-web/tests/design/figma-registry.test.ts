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
import { buildDefaultFigmaImportContent } from "../../lib/design/figma-generator";

const CONTENT: FigmaContent = buildDefaultFigmaImportContent("seed-file");

describe("Figma Registry — lib/design/figma.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "figma-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listFigmaRecords() returns an empty array before anything is recorded", () => {
    expect(listFigmaRecords(baseDir)).toEqual([]);
  });

  it("recordFigmaImport() creates a new record (version 1) and persists to lib/data/design-figma.json", () => {
    const record = recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: true },
      baseDir
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

  it("recordFigmaImport() called again for the same (reviewId, figmaFileId) updates the existing record instead of creating a new one", () => {
    const first = recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: true },
      baseDir
    );
    const second = recordFigmaImport(
      {
        reviewId: "review-1",
        planId: "plan-1",
        figmaFileId: "file-1",
        fileName: "My File (renamed)",
        content: CONTENT,
        simulated: false,
      },
      baseDir
    );

    expect(second.id).toBe(first.id);
    expect(second.version).toBe(2);
    expect(second.fileName).toBe("My File (renamed)");
    expect(second.importHistory).toHaveLength(2);
    expect(listFigmaRecords(baseDir)).toHaveLength(1);
  });

  it("recordFigmaExport() on a record that only has import history appends to exportHistory and bumps version", () => {
    recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: true },
      baseDir
    );
    const exported = recordFigmaExport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: false },
      baseDir
    );

    expect(exported.version).toBe(2);
    expect(exported.importHistory).toHaveLength(1);
    expect(exported.exportHistory).toHaveLength(1);
    expect(exported.exportHistory[0].operation).toBe("export");
    expect(exported.simulated).toBe(false);
  });

  it("a different figmaFileId for the same reviewId creates a separate record", () => {
    recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "File A", content: CONTENT, simulated: true },
      baseDir
    );
    recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-2", fileName: "File B", content: CONTENT, simulated: true },
      baseDir
    );

    expect(listFigmaRecords(baseDir)).toHaveLength(2);
    expect(listFigmaRecordsForReview("review-1", baseDir)).toHaveLength(2);
  });

  it("getFigmaRecord() finds a record by id, null for unknown id", () => {
    const record = recordFigmaImport(
      { reviewId: "review-1", planId: "plan-1", figmaFileId: "file-1", fileName: "My File", content: CONTENT, simulated: true },
      baseDir
    );

    expect(getFigmaRecord(record.id, baseDir)?.figmaFileId).toBe("file-1");
    expect(getFigmaRecord("does-not-exist", baseDir)).toBeNull();
  });

  it("listFigmaRecords() returns entries newest first", () => {
    recordFigmaImport(
      { reviewId: "review-a", planId: "plan-a", figmaFileId: "file-a", fileName: "A", content: CONTENT, simulated: true },
      baseDir
    );
    recordFigmaImport(
      { reviewId: "review-b", planId: "plan-b", figmaFileId: "file-b", fileName: "B", content: CONTENT, simulated: true },
      baseDir
    );

    expect(listFigmaRecords(baseDir).map((r) => r.reviewId)).toEqual(["review-b", "review-a"]);
  });

  it("listFigmaRecordsForReview() filters to only the given review's Figma files", () => {
    recordFigmaImport(
      { reviewId: "review-a", planId: "plan-a", figmaFileId: "file-a", fileName: "A", content: CONTENT, simulated: true },
      baseDir
    );
    recordFigmaImport(
      { reviewId: "review-b", planId: "plan-b", figmaFileId: "file-b", fileName: "B", content: CONTENT, simulated: true },
      baseDir
    );

    expect(listFigmaRecordsForReview("review-a", baseDir)).toHaveLength(1);
    expect(listFigmaRecordsForReview("review-c", baseDir)).toHaveLength(0);
  });

  it("records the acting user on each history entry", () => {
    const record = recordFigmaImport(
      {
        reviewId: "review-1",
        planId: "plan-1",
        figmaFileId: "file-1",
        fileName: "My File",
        content: CONTENT,
        simulated: true,
        actor: "designer@cnbiz.kr",
      },
      baseDir
    );

    expect(record.importHistory[0].actor).toBe("designer@cnbiz.kr");
  });
});
