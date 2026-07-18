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
import { createFsStore } from "../../lib/db/fsStore";
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
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "wireframe-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listWireframes() returns an empty array before anything is created", async () => {
    expect(await listWireframes(store)).toEqual([]);
  });

  it("createWireframe() assigns an id/createdAt and persists to lib/data/design-wireframes.json", async () => {
    const content = buildDefaultWireframe(STORYBOARD);
    const record = await createWireframe(
      { storyboardId: STORYBOARD.id, planId: STORYBOARD.planId, content, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-wireframes.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].storyboardId).toBe(STORYBOARD.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("getWireframe() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultWireframe(STORYBOARD);
    const record = await createWireframe(
      { storyboardId: STORYBOARD.id, planId: STORYBOARD.planId, content, simulated: true },
      store
    );

    expect((await getWireframe(record.id, store))?.storyboardId).toBe(STORYBOARD.id);
    expect(await getWireframe("does-not-exist", store)).toBeNull();
  });

  it("listWireframes() returns entries newest first", async () => {
    const content = buildDefaultWireframe(STORYBOARD);
    await createWireframe({ storyboardId: STORYBOARD.id, planId: STORYBOARD.planId, content, simulated: true }, store);
    await createWireframe({ storyboardId: "storyboard-other", planId: "plan-other", content, simulated: true }, store);

    const records = await listWireframes(store);
    expect(records.map((r) => r.storyboardId)).toEqual(["storyboard-other", STORYBOARD.id]);
  });

  it("listWireframesForStoryboard() filters to only the given storyboard's wireframes", async () => {
    const content = buildDefaultWireframe(STORYBOARD);
    await createWireframe({ storyboardId: "storyboard-a", planId: "plan-a", content, simulated: true }, store);
    await createWireframe({ storyboardId: "storyboard-b", planId: "plan-b", content, simulated: true }, store);
    await createWireframe({ storyboardId: "storyboard-a", planId: "plan-a", content, simulated: true }, store);

    expect(await listWireframesForStoryboard("storyboard-a", store)).toHaveLength(2);
    expect(await listWireframesForStoryboard("storyboard-b", store)).toHaveLength(1);
    expect(await listWireframesForStoryboard("storyboard-c", store)).toHaveLength(0);
  });

  it("preserves provider/model metadata when provided", async () => {
    const content = buildDefaultWireframe(STORYBOARD);
    const record = await createWireframe(
      {
        storyboardId: STORYBOARD.id,
        planId: STORYBOARD.planId,
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
