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
import { createFsStore } from "../../lib/db/fsStore";
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
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "storyboard-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listStoryboards() returns an empty array before anything is created", async () => {
    expect(await listStoryboards(store)).toEqual([]);
  });

  it("createStoryboard() assigns an id/createdAt and persists to lib/data/design-storyboards.json", async () => {
    const content = buildDefaultStoryboard(PLAN);
    const record = await createStoryboard({ planId: PLAN.id, content, simulated: true }, store);

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-storyboards.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("getStoryboard() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultStoryboard(PLAN);
    const record = await createStoryboard({ planId: PLAN.id, content, simulated: true }, store);

    expect((await getStoryboard(record.id, store))?.planId).toBe(PLAN.id);
    expect(await getStoryboard("does-not-exist", store)).toBeNull();
  });

  it("listStoryboards() returns entries newest first", async () => {
    const content = buildDefaultStoryboard(PLAN);
    await createStoryboard({ planId: PLAN.id, content, simulated: true }, store);
    await createStoryboard({ planId: "design-plan-other", content, simulated: true }, store);

    const records = await listStoryboards(store);
    expect(records.map((r) => r.planId)).toEqual(["design-plan-other", PLAN.id]);
  });

  it("listStoryboardsForPlan() filters to only the given plan's storyboards", async () => {
    const content = buildDefaultStoryboard(PLAN);
    await createStoryboard({ planId: "plan-a", content, simulated: true }, store);
    await createStoryboard({ planId: "plan-b", content, simulated: true }, store);
    await createStoryboard({ planId: "plan-a", content, simulated: true }, store);

    expect(await listStoryboardsForPlan("plan-a", store)).toHaveLength(2);
    expect(await listStoryboardsForPlan("plan-b", store)).toHaveLength(1);
    expect(await listStoryboardsForPlan("plan-c", store)).toHaveLength(0);
  });

  it("preserves provider/model metadata when provided", async () => {
    const content = buildDefaultStoryboard(PLAN);
    const record = await createStoryboard(
      { planId: PLAN.id, content, simulated: false, provider: "openai", model: "gpt-4o-mini" },
      store
    );

    expect(record.provider).toBe("openai");
    expect(record.model).toBe("gpt-4o-mini");
  });
});
