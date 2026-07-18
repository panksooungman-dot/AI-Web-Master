import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createWebsiteRecord, listWebsites } from "../../lib/websites/registry";

describe("Website Builder — registry (lib/websites/registry.ts)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "websites-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createWebsiteRecord() then listWebsites() round-trips the same record", async () => {
    const created = await createWebsiteRecord(
      {
        name: "My Dental Site",
        siteType: "dental",
        outDir: "D:/generated/my-dental-site",
        status: "Success",
        simulatedContent: true,
      },
      store
    );

    const records = await listWebsites(store);

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(created.id);
    expect(records[0].siteType).toBe("dental");
    expect(records[0].simulatedContent).toBe(true);
  });

  it("listWebsites() returns newest first", async () => {
    await createWebsiteRecord(
      { name: "First", siteType: "website", outDir: "a", status: "Success", simulatedContent: false },
      store
    );
    await createWebsiteRecord(
      { name: "Second", siteType: "website", outDir: "b", status: "Success", simulatedContent: false },
      store
    );

    const records = await listWebsites(store);

    expect(records[0].name).toBe("Second");
    expect(records[1].name).toBe("First");
  });

  it("records a failed generation with its error message", async () => {
    await createWebsiteRecord(
      {
        name: "Broken",
        siteType: "website",
        outDir: "c",
        status: "Failed",
        simulatedContent: false,
        error: "workflow step failed",
      },
      store
    );

    const records = await listWebsites(store);

    expect(records[0].status).toBe("Failed");
    expect(records[0].error).toBe("workflow step failed");
  });
});
