import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createPrototype,
  getPrototype,
  listPrototypes,
  listPrototypesForWireframe,
} from "../../lib/design/prototype";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";

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

const WIREFRAME: WireframeRecord = {
  id: "wireframe-acme",
  storyboardId: STORYBOARD.id,
  planId: PLAN.id,
  content: buildDefaultWireframe(STORYBOARD),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Prototype Registry — lib/design/prototype.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "prototype-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listPrototypes() returns an empty array before anything is created", () => {
    expect(listPrototypes(baseDir)).toEqual([]);
  });

  it("createPrototype() assigns an id/createdAt/version(1) and persists to lib/data/design-prototypes.json", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const record = createPrototype(
      { wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true },
      baseDir
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.version).toBe(1);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-prototypes.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].wireframeId).toBe(WIREFRAME.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("createPrototype() auto-increments version per wireframeId, preserving history (no overwrite)", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const v1 = createPrototype({ wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true }, baseDir);
    const v2 = createPrototype({ wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true }, baseDir);
    const v3 = createPrototype({ wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true }, baseDir);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(v3.version).toBe(3);
    expect(listPrototypesForWireframe(WIREFRAME.id, baseDir)).toHaveLength(3);
    expect(v1.id).not.toBe(v2.id);
  });

  it("createPrototype() tracks version independently per wireframeId", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const aV1 = createPrototype({ wireframeId: "wireframe-a", planId: "plan-a", content, simulated: true }, baseDir);
    const bV1 = createPrototype({ wireframeId: "wireframe-b", planId: "plan-b", content, simulated: true }, baseDir);
    const aV2 = createPrototype({ wireframeId: "wireframe-a", planId: "plan-a", content, simulated: true }, baseDir);

    expect(aV1.version).toBe(1);
    expect(bV1.version).toBe(1);
    expect(aV2.version).toBe(2);
  });

  it("getPrototype() finds a record by id, null for unknown id", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const record = createPrototype(
      { wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true },
      baseDir
    );

    expect(getPrototype(record.id, baseDir)?.wireframeId).toBe(WIREFRAME.id);
    expect(getPrototype("does-not-exist", baseDir)).toBeNull();
  });

  it("listPrototypes() returns entries newest first", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    createPrototype({ wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true }, baseDir);
    createPrototype({ wireframeId: "wireframe-other", planId: "plan-other", content, simulated: true }, baseDir);

    const records = listPrototypes(baseDir);
    expect(records.map((r) => r.wireframeId)).toEqual(["wireframe-other", WIREFRAME.id]);
  });

  it("listPrototypesForWireframe() filters to only the given wireframe's prototypes", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    createPrototype({ wireframeId: "wireframe-a", planId: "plan-a", content, simulated: true }, baseDir);
    createPrototype({ wireframeId: "wireframe-b", planId: "plan-b", content, simulated: true }, baseDir);
    createPrototype({ wireframeId: "wireframe-a", planId: "plan-a", content, simulated: true }, baseDir);

    expect(listPrototypesForWireframe("wireframe-a", baseDir)).toHaveLength(2);
    expect(listPrototypesForWireframe("wireframe-b", baseDir)).toHaveLength(1);
    expect(listPrototypesForWireframe("wireframe-c", baseDir)).toHaveLength(0);
  });

  it("preserves provider/model metadata when provided", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const record = createPrototype(
      {
        wireframeId: WIREFRAME.id,
        planId: WIREFRAME.planId,
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
