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
import { createFsStore } from "../../lib/db/fsStore";
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
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "prototype-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listPrototypes() returns an empty array before anything is created", async () => {
    expect(await listPrototypes(store)).toEqual([]);
  });

  it("createPrototype() assigns an id/createdAt/version(1) and persists to lib/data/design-prototypes.json", async () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const record = await createPrototype(
      { wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true },
      store
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

  it("createPrototype() auto-increments version per wireframeId, preserving history (no overwrite)", async () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const v1 = await createPrototype({ wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true }, store);
    const v2 = await createPrototype({ wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true }, store);
    const v3 = await createPrototype({ wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true }, store);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(v3.version).toBe(3);
    expect(await listPrototypesForWireframe(WIREFRAME.id, store)).toHaveLength(3);
    expect(v1.id).not.toBe(v2.id);
  });

  it("createPrototype() tracks version independently per wireframeId", async () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const aV1 = await createPrototype({ wireframeId: "wireframe-a", planId: "plan-a", content, simulated: true }, store);
    const bV1 = await createPrototype({ wireframeId: "wireframe-b", planId: "plan-b", content, simulated: true }, store);
    const aV2 = await createPrototype({ wireframeId: "wireframe-a", planId: "plan-a", content, simulated: true }, store);

    expect(aV1.version).toBe(1);
    expect(bV1.version).toBe(1);
    expect(aV2.version).toBe(2);
  });

  it("getPrototype() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const record = await createPrototype(
      { wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true },
      store
    );

    expect((await getPrototype(record.id, store))?.wireframeId).toBe(WIREFRAME.id);
    expect(await getPrototype("does-not-exist", store)).toBeNull();
  });

  it("listPrototypes() returns entries newest first", async () => {
    const content = buildDefaultPrototype(WIREFRAME);
    await createPrototype({ wireframeId: WIREFRAME.id, planId: WIREFRAME.planId, content, simulated: true }, store);
    await createPrototype({ wireframeId: "wireframe-other", planId: "plan-other", content, simulated: true }, store);

    const records = await listPrototypes(store);
    expect(records.map((r) => r.wireframeId)).toEqual(["wireframe-other", WIREFRAME.id]);
  });

  it("listPrototypesForWireframe() filters to only the given wireframe's prototypes", async () => {
    const content = buildDefaultPrototype(WIREFRAME);
    await createPrototype({ wireframeId: "wireframe-a", planId: "plan-a", content, simulated: true }, store);
    await createPrototype({ wireframeId: "wireframe-b", planId: "plan-b", content, simulated: true }, store);
    await createPrototype({ wireframeId: "wireframe-a", planId: "plan-a", content, simulated: true }, store);

    expect(await listPrototypesForWireframe("wireframe-a", store)).toHaveLength(2);
    expect(await listPrototypesForWireframe("wireframe-b", store)).toHaveLength(1);
    expect(await listPrototypesForWireframe("wireframe-c", store)).toHaveLength(0);
  });

  it("preserves provider/model metadata when provided", async () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const record = await createPrototype(
      {
        wireframeId: WIREFRAME.id,
        planId: WIREFRAME.planId,
        content,
        simulated: false,
        provider: "openai",
        model: "gpt-4o-mini",
      },
      store
    );

    expect(record.provider).toBe("openai");
    expect(record.model).toBe("gpt-4o-mini");
  });
});
