import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createClaudeDesign,
  getClaudeDesign,
  listClaudeDesigns,
  listClaudeDesignsForPrototype,
} from "../../lib/design/claude-design";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultClaudeDesign } from "../../lib/design/claude-design-generator";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { PrototypeRecord } from "../../lib/design/prototype";

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

const PROTOTYPE: PrototypeRecord = {
  id: "prototype-acme",
  wireframeId: WIREFRAME.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultPrototype(WIREFRAME),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Claude Design Registry — lib/design/claude-design.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-design-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listClaudeDesigns() returns an empty array before anything is created", async () => {
    expect(await listClaudeDesigns(store)).toEqual([]);
  });

  it("createClaudeDesign() assigns an id/createdAt and persists to lib/data/design-claude.json", async () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    const record = await createClaudeDesign(
      { prototypeId: PROTOTYPE.id, planId: PROTOTYPE.planId, content, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-claude.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].prototypeId).toBe(PROTOTYPE.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("getClaudeDesign() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    const record = await createClaudeDesign(
      { prototypeId: PROTOTYPE.id, planId: PROTOTYPE.planId, content, simulated: true },
      store
    );

    expect((await getClaudeDesign(record.id, store))?.prototypeId).toBe(PROTOTYPE.id);
    expect(await getClaudeDesign("does-not-exist", store)).toBeNull();
  });

  it("listClaudeDesigns() returns entries newest first", async () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    await createClaudeDesign({ prototypeId: PROTOTYPE.id, planId: PROTOTYPE.planId, content, simulated: true }, store);
    await createClaudeDesign({ prototypeId: "prototype-other", planId: "plan-other", content, simulated: true }, store);

    const records = await listClaudeDesigns(store);
    expect(records.map((r) => r.prototypeId)).toEqual(["prototype-other", PROTOTYPE.id]);
  });

  it("listClaudeDesignsForPrototype() filters to only the given prototype's records", async () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    await createClaudeDesign({ prototypeId: "prototype-a", planId: "plan-a", content, simulated: true }, store);
    await createClaudeDesign({ prototypeId: "prototype-b", planId: "plan-b", content, simulated: true }, store);
    await createClaudeDesign({ prototypeId: "prototype-a", planId: "plan-a", content, simulated: true }, store);

    expect(await listClaudeDesignsForPrototype("prototype-a", store)).toHaveLength(2);
    expect(await listClaudeDesignsForPrototype("prototype-b", store)).toHaveLength(1);
    expect(await listClaudeDesignsForPrototype("prototype-c", store)).toHaveLength(0);
  });

  it("createClaudeDesign() does not overwrite existing records when called again for the same prototype", async () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    const first = await createClaudeDesign(
      { prototypeId: PROTOTYPE.id, planId: PROTOTYPE.planId, content, simulated: true },
      store
    );
    const second = await createClaudeDesign(
      { prototypeId: PROTOTYPE.id, planId: PROTOTYPE.planId, content, simulated: true },
      store
    );

    expect(first.id).not.toBe(second.id);
    expect(await listClaudeDesignsForPrototype(PROTOTYPE.id, store)).toHaveLength(2);
  });

  it("preserves provider/model metadata when provided", async () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    const record = await createClaudeDesign(
      {
        prototypeId: PROTOTYPE.id,
        planId: PROTOTYPE.planId,
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
