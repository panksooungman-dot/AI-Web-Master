import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  getLatestWebsiteBuildForReview,
  getWebsiteBuildRecord,
  listWebsiteBuilds,
  listWebsiteBuildsForReview,
  recordWebsiteBuild,
} from "../../lib/design/website-build";

describe("Website Build Registry — lib/design/website-build.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "website-build-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listWebsiteBuilds() returns an empty array before anything is recorded", async () => {
    expect(await listWebsiteBuilds(store)).toEqual([]);
  });

  it("recordWebsiteBuild() creates a new record (version 1) and persists it", async () => {
    const record = await recordWebsiteBuild(
      {
        reviewId: "review-1",
        planId: "plan-1",
        websiteId: "website-1",
        siteType: "dental",
        status: "Success",
        simulatedContent: false,
      },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.version).toBe(1);
    expect(record.history).toHaveLength(1);
    expect(record.history[0].websiteId).toBe("website-1");

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-website-builds.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
  });

  it("recordWebsiteBuild() called again for the same reviewId updates the existing record (version+1) instead of creating a new one", async () => {
    const first = await recordWebsiteBuild(
      { reviewId: "review-1", planId: "plan-1", websiteId: "website-1", siteType: "dental", status: "Success", simulatedContent: false },
      store
    );
    const second = await recordWebsiteBuild(
      { reviewId: "review-1", planId: "plan-1", websiteId: "website-2", siteType: "dental", status: "Failed", simulatedContent: true, error: "CLI 실행 실패" },
      store
    );

    expect(second.id).toBe(first.id);
    expect(second.version).toBe(2);
    expect(second.status).toBe("Failed");
    expect(second.websiteId).toBe("website-2");
    expect(second.history).toHaveLength(2);
    expect(await listWebsiteBuilds(store)).toHaveLength(1);
  });

  it("a different reviewId creates a separate record", async () => {
    await recordWebsiteBuild({ reviewId: "review-a", planId: "plan-a", websiteId: "website-a", siteType: "website", status: "Success", simulatedContent: false }, store);
    await recordWebsiteBuild({ reviewId: "review-b", planId: "plan-b", websiteId: "website-b", siteType: "website", status: "Success", simulatedContent: false }, store);

    expect(await listWebsiteBuilds(store)).toHaveLength(2);
    expect(await listWebsiteBuildsForReview("review-a", store)).toHaveLength(1);
  });

  it("getLatestWebsiteBuildForReview() returns null when nothing has been built for that review", async () => {
    expect(await getLatestWebsiteBuildForReview("does-not-exist", store)).toBeNull();
  });

  it("getWebsiteBuildRecord() finds a record by id, null for unknown id", async () => {
    const record = await recordWebsiteBuild(
      { reviewId: "review-1", planId: "plan-1", websiteId: "website-1", siteType: "website", status: "Success", simulatedContent: false },
      store
    );
    expect((await getWebsiteBuildRecord(record.id, store))?.reviewId).toBe("review-1");
    expect(await getWebsiteBuildRecord("does-not-exist", store)).toBeNull();
  });

  it("preserves history across multiple builds for the same review (append-only)", async () => {
    await recordWebsiteBuild({ reviewId: "review-1", planId: "plan-1", websiteId: "website-1", siteType: "website", status: "Success", simulatedContent: false }, store);
    await recordWebsiteBuild({ reviewId: "review-1", planId: "plan-1", websiteId: "website-2", siteType: "website", status: "Failed", simulatedContent: false, error: "실패" }, store);
    const latest = await recordWebsiteBuild({ reviewId: "review-1", planId: "plan-1", websiteId: "website-3", siteType: "website", status: "Success", simulatedContent: false }, store);

    expect(latest.version).toBe(3);
    expect(latest.history).toHaveLength(3);
    expect(latest.history.map((h) => h.websiteId)).toEqual(["website-1", "website-2", "website-3"]);
    expect((await getLatestWebsiteBuildForReview("review-1", store))?.id).toBe(latest.id);
  });
});
