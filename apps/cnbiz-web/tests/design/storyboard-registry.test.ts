import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createStoryboard,
  getStoryboard,
  listStoryboards,
  listStoryboardsForPlan,
} from "../../lib/design/storyboard";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";

const PLAN_INPUT: DesignPlanInput = {
  projectName: "Acme Site",
  projectType: "corporate",
  requirements: "Need a corporate site.",
  targetUsers: "B2B buyers",
};

const PLAN: DesignPlanRecord = {
  id: "design-plan-acme",
  input: PLAN_INPUT,
  content: buildDefaultDesignPlan(PLAN_INPUT),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Storyboard Registry — lib/design/storyboard.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "storyboard-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listStoryboards() returns an empty array before anything is created", () => {
    expect(listStoryboards(baseDir)).toEqual([]);
  });

  it("createStoryboard() assigns an id/createdAt and persists to lib/data/design-storyboards.json", () => {
    const content = buildDefaultStoryboard(PLAN);
    const record = createStoryboard({ planId: PLAN.id, content, simulated: true }, baseDir);

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-storyboards.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("getStoryboard() finds a record by id, null for unknown id", () => {
    const content = buildDefaultStoryboard(PLAN);
    const record = createStoryboard({ planId: PLAN.id, content, simulated: true }, baseDir);

    expect(getStoryboard(record.id, baseDir)?.planId).toBe(PLAN.id);
    expect(getStoryboard("does-not-exist", baseDir)).toBeNull();
  });

  it("listStoryboards() returns entries newest first", () => {
    const content = buildDefaultStoryboard(PLAN);
    createStoryboard({ planId: PLAN.id, content, simulated: true }, baseDir);
    createStoryboard({ planId: "design-plan-other", content, simulated: true }, baseDir);

    const records = listStoryboards(baseDir);
    expect(records.map((r) => r.planId)).toEqual(["design-plan-other", PLAN.id]);
  });

  it("listStoryboardsForPlan() filters to only the given plan's storyboards", () => {
    const content = buildDefaultStoryboard(PLAN);
    createStoryboard({ planId: "plan-a", content, simulated: true }, baseDir);
    createStoryboard({ planId: "plan-b", content, simulated: true }, baseDir);
    createStoryboard({ planId: "plan-a", content, simulated: true }, baseDir);

    expect(listStoryboardsForPlan("plan-a", baseDir)).toHaveLength(2);
    expect(listStoryboardsForPlan("plan-b", baseDir)).toHaveLength(1);
    expect(listStoryboardsForPlan("plan-c", baseDir)).toHaveLength(0);
  });

  it("preserves provider/model metadata when provided", () => {
    const content = buildDefaultStoryboard(PLAN);
    const record = createStoryboard(
      { planId: PLAN.id, content, simulated: false, provider: "openai", model: "gpt-4o-mini" },
      baseDir
    );

    expect(record.provider).toBe("openai");
    expect(record.model).toBe("gpt-4o-mini");
  });
});
