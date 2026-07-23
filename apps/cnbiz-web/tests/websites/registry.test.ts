import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createWebsiteRecord, getWebsite, listWebsites, updateWebsiteDeployment } from "../../lib/websites/registry";

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

  describe("getWebsite() (AI Business OS Rewiring Phase 3)", () => {
    it("finds a record by id", async () => {
      const created = await createWebsiteRecord(
        { name: "Findable", siteType: "website", outDir: "d", status: "Success", simulatedContent: false },
        store
      );

      const found = await getWebsite(created.id, store);
      expect(found?.id).toBe(created.id);
    });

    it("returns undefined for an unknown id", async () => {
      expect(await getWebsite("does-not-exist", store)).toBeUndefined();
    });
  });

  describe("updateWebsiteDeployment() (AI Business OS Rewiring Phase 3)", () => {
    it("attaches repository/deployment info and returns the updated record", async () => {
      const created = await createWebsiteRecord(
        { name: "Deployable", siteType: "restaurant", outDir: "e", status: "Success", simulatedContent: false },
        store
      );

      const updated = await updateWebsiteDeployment(
        created.id,
        {
          repository: {
            owner: "cnbiz-customers",
            name: "restaurant-a1b2c3d4",
            fullName: "cnbiz-customers/restaurant-a1b2c3d4",
            htmlUrl: "https://github.com/cnbiz-customers/restaurant-a1b2c3d4",
            cloneUrl: "https://github.com/cnbiz-customers/restaurant-a1b2c3d4.git",
          },
          deployment: {
            vercelProjectId: "prj_123",
            vercelProjectName: "restaurant-a1b2c3d4",
            deploymentId: "dpl_123",
            url: "https://restaurant-a1b2c3d4.vercel.app",
          },
          deploymentStatus: "Success",
          deploymentError: null,
        },
        store
      );

      expect(updated?.deploymentStatus).toBe("Success");
      expect(updated?.repository?.fullName).toBe("cnbiz-customers/restaurant-a1b2c3d4");
      expect(updated?.deployment?.url).toBe("https://restaurant-a1b2c3d4.vercel.app");

      const refetched = await getWebsite(created.id, store);
      expect(refetched?.deploymentStatus).toBe("Success");
    });

    it("returns undefined for an unknown id and does not throw", async () => {
      expect(await updateWebsiteDeployment("does-not-exist", { deploymentStatus: "Failed" }, store)).toBeUndefined();
    });

    it("records NotConfigured status with an error message and no repository/deployment", async () => {
      const created = await createWebsiteRecord(
        { name: "Unconfigured", siteType: "website", outDir: "f", status: "Success", simulatedContent: false },
        store
      );

      const updated = await updateWebsiteDeployment(
        created.id,
        { deploymentStatus: "NotConfigured", deploymentError: "GITHUB_TOKEN 또는 VERCEL_TOKEN이 설정되지 않았습니다." },
        store
      );

      expect(updated?.deploymentStatus).toBe("NotConfigured");
      expect(updated?.repository).toBeUndefined();
    });
  });
});
