import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabaseDesign,
  getDatabaseDesign,
  listDatabaseDesigns,
  listDatabaseDesignsForPlan,
} from "../../lib/design/database-design";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";

const PLAN_INPUT: DesignPlanInput = {
  projectName: "Acme Site",
  projectType: "corporate",
  requirements: "Need a corporate site with a booking feature.",
  targetUsers: "B2B buyers",
};

const PLAN: DesignPlanRecord = {
  id: "design-plan-acme",
  input: PLAN_INPUT,
  content: buildDefaultDesignPlan(PLAN_INPUT),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Database Design Registry — lib/design/database-design.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "database-design-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listDatabaseDesigns() returns an empty array before anything is created", async () => {
    expect(await listDatabaseDesigns(store)).toEqual([]);
  });

  it("createDatabaseDesign() assigns an id/createdAt/version(1) and persists to lib/data/design-database.json", async () => {
    const content = buildDefaultDatabaseDesign(PLAN);
    const record = await createDatabaseDesign({ planId: PLAN.id, content, simulated: true }, store);

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.version).toBe(1);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-database.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("createDatabaseDesign() auto-increments version per planId, preserving history (no overwrite)", async () => {
    const content = buildDefaultDatabaseDesign(PLAN);
    const v1 = await createDatabaseDesign({ planId: PLAN.id, content, simulated: true }, store);
    const v2 = await createDatabaseDesign({ planId: PLAN.id, content, simulated: true }, store);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(await listDatabaseDesignsForPlan(PLAN.id, store)).toHaveLength(2);
    expect(v1.id).not.toBe(v2.id);
  });

  it("getDatabaseDesign() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultDatabaseDesign(PLAN);
    const record = await createDatabaseDesign({ planId: PLAN.id, content, simulated: true }, store);

    expect((await getDatabaseDesign(record.id, store))?.planId).toBe(PLAN.id);
    expect(await getDatabaseDesign("does-not-exist", store)).toBeNull();
  });

  it("listDatabaseDesigns() returns entries newest first", async () => {
    const content = buildDefaultDatabaseDesign(PLAN);
    await createDatabaseDesign({ planId: PLAN.id, content, simulated: true }, store);
    await createDatabaseDesign({ planId: "plan-other", content, simulated: true }, store);

    const records = await listDatabaseDesigns(store);
    expect(records.map((r) => r.planId)).toEqual(["plan-other", PLAN.id]);
  });

  it("listDatabaseDesignsForPlan() filters to only the given plan's designs", async () => {
    const content = buildDefaultDatabaseDesign(PLAN);
    await createDatabaseDesign({ planId: "plan-a", content, simulated: true }, store);
    await createDatabaseDesign({ planId: "plan-b", content, simulated: true }, store);
    await createDatabaseDesign({ planId: "plan-a", content, simulated: true }, store);

    expect(await listDatabaseDesignsForPlan("plan-a", store)).toHaveLength(2);
    expect(await listDatabaseDesignsForPlan("plan-b", store)).toHaveLength(1);
    expect(await listDatabaseDesignsForPlan("plan-c", store)).toHaveLength(0);
  });
});
