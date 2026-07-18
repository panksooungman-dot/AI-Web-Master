import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createWireframe,
  getWireframe,
  listWireframes,
  listWireframesForStoryboard,
} from "../../lib/design/wireframe";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";

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

const STORYBOARD: StoryboardRecord = {
  id: "storyboard-acme",
  planId: PLAN.id,
  content: buildDefaultStoryboard(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Wireframe Registry — lib/design/wireframe.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "wireframe-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listWireframes() returns an empty array before anything is created", () => {
    expect(listWireframes(baseDir)).toEqual([]);
  });

  it("createWireframe() assigns an id/createdAt and persists to lib/data/design-wireframes.json", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    const record = createWireframe(
      { storyboardId: STORYBOARD.id, planId: STORYBOARD.planId, content, simulated: true },
      baseDir
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-wireframes.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].storyboardId).toBe(STORYBOARD.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("getWireframe() finds a record by id, null for unknown id", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    const record = createWireframe(
      { storyboardId: STORYBOARD.id, planId: STORYBOARD.planId, content, simulated: true },
      baseDir
    );

    expect(getWireframe(record.id, baseDir)?.storyboardId).toBe(STORYBOARD.id);
    expect(getWireframe("does-not-exist", baseDir)).toBeNull();
  });

  it("listWireframes() returns entries newest first", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    createWireframe({ storyboardId: STORYBOARD.id, planId: STORYBOARD.planId, content, simulated: true }, baseDir);
    createWireframe({ storyboardId: "storyboard-other", planId: "plan-other", content, simulated: true }, baseDir);

    const records = listWireframes(baseDir);
    expect(records.map((r) => r.storyboardId)).toEqual(["storyboard-other", STORYBOARD.id]);
  });

  it("listWireframesForStoryboard() filters to only the given storyboard's wireframes", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    createWireframe({ storyboardId: "storyboard-a", planId: "plan-a", content, simulated: true }, baseDir);
    createWireframe({ storyboardId: "storyboard-b", planId: "plan-b", content, simulated: true }, baseDir);
    createWireframe({ storyboardId: "storyboard-a", planId: "plan-a", content, simulated: true }, baseDir);

    expect(listWireframesForStoryboard("storyboard-a", baseDir)).toHaveLength(2);
    expect(listWireframesForStoryboard("storyboard-b", baseDir)).toHaveLength(1);
    expect(listWireframesForStoryboard("storyboard-c", baseDir)).toHaveLength(0);
  });

  it("preserves provider/model metadata when provided", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    const record = createWireframe(
      {
        storyboardId: STORYBOARD.id,
        planId: STORYBOARD.planId,
        content,
        simulated: false,
        provider: "openai",
        model: "gpt-4o-mini",
      },
      baseDir
    );

    expect(record.provider).toBe("openai");
    expect(record.model).toBe("gpt-4o-mini");
  });
});
