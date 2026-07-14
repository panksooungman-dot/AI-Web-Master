import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWebsiteRecord, listWebsites } from "../../lib/websites/registry";

describe("Website Builder — registry (lib/websites/registry.ts)", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "websites-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createWebsiteRecord() then listWebsites() round-trips the same record", () => {
    const created = createWebsiteRecord(
      {
        name: "My Dental Site",
        siteType: "dental",
        outDir: "D:/generated/my-dental-site",
        status: "Success",
        simulatedContent: true,
      },
      baseDir
    );

    const records = listWebsites(baseDir);

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(created.id);
    expect(records[0].siteType).toBe("dental");
    expect(records[0].simulatedContent).toBe(true);
  });

  it("listWebsites() returns newest first", () => {
    createWebsiteRecord(
      { name: "First", siteType: "website", outDir: "a", status: "Success", simulatedContent: false },
      baseDir
    );
    createWebsiteRecord(
      { name: "Second", siteType: "website", outDir: "b", status: "Success", simulatedContent: false },
      baseDir
    );

    const records = listWebsites(baseDir);

    expect(records[0].name).toBe("Second");
    expect(records[1].name).toBe("First");
  });

  it("records a failed generation with its error message", () => {
    createWebsiteRecord(
      {
        name: "Broken",
        siteType: "website",
        outDir: "c",
        status: "Failed",
        simulatedContent: false,
        error: "workflow step failed",
      },
      baseDir
    );

    const records = listWebsites(baseDir);

    expect(records[0].status).toBe("Failed");
    expect(records[0].error).toBe("workflow step failed");
  });
});
