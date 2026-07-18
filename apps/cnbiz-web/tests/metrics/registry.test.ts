import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { incrementMetric, readMetrics } from "../../lib/metrics/registry";

describe("Metrics — lib/metrics/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "metrics-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("readMetrics() starts all counters at 0", async () => {
    expect(await readMetrics(store)).toEqual({
      buildCount: 0,
      websiteGenerationCount: 0,
      aiTaskCount: 0,
      marketplaceInstallCount: 0,
      storyboardGenerationCount: 0,
      wireframeGenerationCount: 0,
      prototypeGenerationCount: 0,
      claudeDesignGenerationCount: 0,
      reviewCount: 0,
      approvalCount: 0,
      revisionCount: 0,
      figmaImportCount: 0,
      figmaExportCount: 0,
      designSyncCount: 0,
      conflictCount: 0,
      rollbackCount: 0,
      designWebsiteBuildCount: 0,
    });
  });

  it("incrementMetric() increments the named counter by 1 by default", async () => {
    await incrementMetric("buildCount", undefined, store);
    await incrementMetric("buildCount", undefined, store);

    expect((await readMetrics(store)).buildCount).toBe(2);
  });

  it("incrementMetric() supports a custom increment amount", async () => {
    await incrementMetric("aiTaskCount", 5, store);
    expect((await readMetrics(store)).aiTaskCount).toBe(5);
  });

  it("incrementMetric() leaves other counters untouched", async () => {
    await incrementMetric("marketplaceInstallCount", undefined, store);

    const counters = await readMetrics(store);
    expect(counters.marketplaceInstallCount).toBe(1);
    expect(counters.buildCount).toBe(0);
    expect(counters.websiteGenerationCount).toBe(0);
    expect(counters.aiTaskCount).toBe(0);
  });

  it("persists counters across separate reads (survives process/module reload semantics)", async () => {
    await incrementMetric("websiteGenerationCount", undefined, store);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "metrics.json"), "utf-8"));
    expect(raw.counters.websiteGenerationCount).toBe(1);
  });

  it("incrementMetric() increments storyboardGenerationCount (Design Automation Phase 2) independently of other counters", async () => {
    await incrementMetric("storyboardGenerationCount", undefined, store);
    await incrementMetric("storyboardGenerationCount", undefined, store);

    const counters = await readMetrics(store);
    expect(counters.storyboardGenerationCount).toBe(2);
    expect(counters.aiTaskCount).toBe(0);
  });

  it("incrementMetric() increments wireframeGenerationCount (Design Automation Phase 3) independently of other counters", async () => {
    await incrementMetric("wireframeGenerationCount", undefined, store);
    await incrementMetric("wireframeGenerationCount", undefined, store);

    const counters = await readMetrics(store);
    expect(counters.wireframeGenerationCount).toBe(2);
    expect(counters.storyboardGenerationCount).toBe(0);
    expect(counters.aiTaskCount).toBe(0);
  });

  it("incrementMetric() increments prototypeGenerationCount (Design Automation Phase 4) independently of other counters", async () => {
    await incrementMetric("prototypeGenerationCount", undefined, store);
    await incrementMetric("prototypeGenerationCount", undefined, store);

    const counters = await readMetrics(store);
    expect(counters.prototypeGenerationCount).toBe(2);
    expect(counters.wireframeGenerationCount).toBe(0);
    expect(counters.storyboardGenerationCount).toBe(0);
    expect(counters.aiTaskCount).toBe(0);
  });

  it("incrementMetric() increments claudeDesignGenerationCount (Design Automation Phase 5) independently of other counters", async () => {
    await incrementMetric("claudeDesignGenerationCount", undefined, store);
    await incrementMetric("claudeDesignGenerationCount", undefined, store);

    const counters = await readMetrics(store);
    expect(counters.claudeDesignGenerationCount).toBe(2);
    expect(counters.prototypeGenerationCount).toBe(0);
    expect(counters.wireframeGenerationCount).toBe(0);
    expect(counters.storyboardGenerationCount).toBe(0);
    expect(counters.aiTaskCount).toBe(0);
  });

  it("incrementMetric() increments reviewCount/approvalCount/revisionCount (Design Automation Phase 6) independently of each other and other counters", async () => {
    await incrementMetric("reviewCount", undefined, store);
    await incrementMetric("reviewCount", undefined, store);
    await incrementMetric("approvalCount", undefined, store);
    await incrementMetric("revisionCount", undefined, store);
    await incrementMetric("revisionCount", undefined, store);
    await incrementMetric("revisionCount", undefined, store);

    const counters = await readMetrics(store);
    expect(counters.reviewCount).toBe(2);
    expect(counters.approvalCount).toBe(1);
    expect(counters.revisionCount).toBe(3);
    expect(counters.claudeDesignGenerationCount).toBe(0);
    expect(counters.prototypeGenerationCount).toBe(0);
  });

  it("incrementMetric() increments figmaImportCount/figmaExportCount (Design Automation Phase 7) independently of each other and other counters", async () => {
    await incrementMetric("figmaImportCount", undefined, store);
    await incrementMetric("figmaImportCount", undefined, store);
    await incrementMetric("figmaExportCount", undefined, store);

    const counters = await readMetrics(store);
    expect(counters.figmaImportCount).toBe(2);
    expect(counters.figmaExportCount).toBe(1);
    expect(counters.reviewCount).toBe(0);
    expect(counters.claudeDesignGenerationCount).toBe(0);
  });

  it("incrementMetric() increments designSyncCount/conflictCount/rollbackCount (Design Automation Phase 8) independently of each other and other counters", async () => {
    await incrementMetric("designSyncCount", undefined, store);
    await incrementMetric("designSyncCount", undefined, store);
    await incrementMetric("designSyncCount", undefined, store);
    await incrementMetric("conflictCount", undefined, store);
    await incrementMetric("rollbackCount", undefined, store);

    const counters = await readMetrics(store);
    expect(counters.designSyncCount).toBe(3);
    expect(counters.conflictCount).toBe(1);
    expect(counters.rollbackCount).toBe(1);
    expect(counters.figmaImportCount).toBe(0);
    expect(counters.reviewCount).toBe(0);
  });

  it("incrementMetric() increments designWebsiteBuildCount (Design Automation Phase 9) independently of other counters", async () => {
    await incrementMetric("designWebsiteBuildCount", undefined, store);
    await incrementMetric("designWebsiteBuildCount", undefined, store);
    await incrementMetric("websiteGenerationCount", undefined, store);

    const counters = await readMetrics(store);
    expect(counters.designWebsiteBuildCount).toBe(2);
    expect(counters.websiteGenerationCount).toBe(1);
    expect(counters.designSyncCount).toBe(0);
  });
});
