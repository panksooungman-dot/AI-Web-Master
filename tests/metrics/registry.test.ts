import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { incrementMetric, readMetrics } from "../../lib/metrics/registry";

describe("Metrics — lib/metrics/registry.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "metrics-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("readMetrics() starts all counters at 0", () => {
    expect(readMetrics(baseDir)).toEqual({
      buildCount: 0,
      websiteGenerationCount: 0,
      aiTaskCount: 0,
      marketplaceInstallCount: 0,
      storyboardGenerationCount: 0,
      wireframeGenerationCount: 0,
      prototypeGenerationCount: 0,
    });
  });

  it("incrementMetric() increments the named counter by 1 by default", () => {
    incrementMetric("buildCount", undefined, baseDir);
    incrementMetric("buildCount", undefined, baseDir);

    expect(readMetrics(baseDir).buildCount).toBe(2);
  });

  it("incrementMetric() supports a custom increment amount", () => {
    incrementMetric("aiTaskCount", 5, baseDir);
    expect(readMetrics(baseDir).aiTaskCount).toBe(5);
  });

  it("incrementMetric() leaves other counters untouched", () => {
    incrementMetric("marketplaceInstallCount", undefined, baseDir);

    const counters = readMetrics(baseDir);
    expect(counters.marketplaceInstallCount).toBe(1);
    expect(counters.buildCount).toBe(0);
    expect(counters.websiteGenerationCount).toBe(0);
    expect(counters.aiTaskCount).toBe(0);
  });

  it("persists counters across separate reads (survives process/module reload semantics)", () => {
    incrementMetric("websiteGenerationCount", undefined, baseDir);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "metrics.json"), "utf-8"));
    expect(raw.websiteGenerationCount).toBe(1);
  });

  it("incrementMetric() increments storyboardGenerationCount (Design Automation Phase 2) independently of other counters", () => {
    incrementMetric("storyboardGenerationCount", undefined, baseDir);
    incrementMetric("storyboardGenerationCount", undefined, baseDir);

    const counters = readMetrics(baseDir);
    expect(counters.storyboardGenerationCount).toBe(2);
    expect(counters.aiTaskCount).toBe(0);
  });

  it("incrementMetric() increments wireframeGenerationCount (Design Automation Phase 3) independently of other counters", () => {
    incrementMetric("wireframeGenerationCount", undefined, baseDir);
    incrementMetric("wireframeGenerationCount", undefined, baseDir);

    const counters = readMetrics(baseDir);
    expect(counters.wireframeGenerationCount).toBe(2);
    expect(counters.storyboardGenerationCount).toBe(0);
    expect(counters.aiTaskCount).toBe(0);
  });

  it("incrementMetric() increments prototypeGenerationCount (Design Automation Phase 4) independently of other counters", () => {
    incrementMetric("prototypeGenerationCount", undefined, baseDir);
    incrementMetric("prototypeGenerationCount", undefined, baseDir);

    const counters = readMetrics(baseDir);
    expect(counters.prototypeGenerationCount).toBe(2);
    expect(counters.wireframeGenerationCount).toBe(0);
    expect(counters.storyboardGenerationCount).toBe(0);
    expect(counters.aiTaskCount).toBe(0);
  });
});
