import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiDesign, getApiDesign, listApiDesigns, listApiDesignsForDatabaseDesign } from "../../lib/design/api-design";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DatabaseDesignRecord } from "../../lib/design/database-design";
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

const DATABASE_DESIGN: DatabaseDesignRecord = {
  id: "database-design-acme",
  planId: PLAN.id,
  version: 1,
  content: buildDefaultDatabaseDesign(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("API Design Registry — lib/design/api-design.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-design-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listApiDesigns() returns an empty array before anything is created", async () => {
    expect(await listApiDesigns(store)).toEqual([]);
  });

  it("createApiDesign() assigns an id/createdAt/version(1) and persists to lib/data/design-api.json", async () => {
    const content = buildDefaultApiDesign(DATABASE_DESIGN);
    const record = await createApiDesign(
      { databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.version).toBe(1);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-api.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].databaseDesignId).toBe(DATABASE_DESIGN.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("createApiDesign() auto-increments version per databaseDesignId, preserving history (no overwrite)", async () => {
    const content = buildDefaultApiDesign(DATABASE_DESIGN);
    const v1 = await createApiDesign(
      { databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true },
      store
    );
    const v2 = await createApiDesign(
      { databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true },
      store
    );

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(await listApiDesignsForDatabaseDesign(DATABASE_DESIGN.id, store)).toHaveLength(2);
    expect(v1.id).not.toBe(v2.id);
  });

  it("getApiDesign() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultApiDesign(DATABASE_DESIGN);
    const record = await createApiDesign(
      { databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true },
      store
    );

    expect((await getApiDesign(record.id, store))?.databaseDesignId).toBe(DATABASE_DESIGN.id);
    expect(await getApiDesign("does-not-exist", store)).toBeNull();
  });

  it("listApiDesigns() returns entries newest first", async () => {
    const content = buildDefaultApiDesign(DATABASE_DESIGN);
    await createApiDesign({ databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    await createApiDesign({ databaseDesignId: "database-design-other", planId: PLAN.id, content, simulated: true }, store);

    const records = await listApiDesigns(store);
    expect(records.map((r) => r.databaseDesignId)).toEqual(["database-design-other", DATABASE_DESIGN.id]);
  });

  it("listApiDesignsForDatabaseDesign() filters to only the given database design's API designs", async () => {
    const content = buildDefaultApiDesign(DATABASE_DESIGN);
    await createApiDesign({ databaseDesignId: "db-a", planId: PLAN.id, content, simulated: true }, store);
    await createApiDesign({ databaseDesignId: "db-b", planId: PLAN.id, content, simulated: true }, store);
    await createApiDesign({ databaseDesignId: "db-a", planId: PLAN.id, content, simulated: true }, store);

    expect(await listApiDesignsForDatabaseDesign("db-a", store)).toHaveLength(2);
    expect(await listApiDesignsForDatabaseDesign("db-b", store)).toHaveLength(1);
    expect(await listApiDesignsForDatabaseDesign("db-c", store)).toHaveLength(0);
  });
});
