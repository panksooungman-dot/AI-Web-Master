import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createBackendDesign,
  getBackendDesign,
  listBackendDesigns,
  listBackendDesignsForApiDesign,
} from "../../lib/design/backend-design";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultBackendDesign } from "../../lib/design/backend-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { ApiDesignRecord } from "../../lib/design/api-design";
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

const API_DESIGN: ApiDesignRecord = {
  id: "api-design-acme",
  databaseDesignId: DATABASE_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultApiDesign(DATABASE_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Backend Design Registry — lib/design/backend-design.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "backend-design-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listBackendDesigns() returns an empty array before anything is created", async () => {
    expect(await listBackendDesigns(store)).toEqual([]);
  });

  it("createBackendDesign() assigns an id/createdAt/version(1) and persists to lib/data/design-backend.json", async () => {
    const content = buildDefaultBackendDesign(API_DESIGN);
    const record = await createBackendDesign(
      { apiDesignId: API_DESIGN.id, planId: PLAN.id, content, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.version).toBe(1);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-backend.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].apiDesignId).toBe(API_DESIGN.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("createBackendDesign() auto-increments version per apiDesignId, preserving history (no overwrite)", async () => {
    const content = buildDefaultBackendDesign(API_DESIGN);
    const v1 = await createBackendDesign({ apiDesignId: API_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    const v2 = await createBackendDesign({ apiDesignId: API_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(await listBackendDesignsForApiDesign(API_DESIGN.id, store)).toHaveLength(2);
    expect(v1.id).not.toBe(v2.id);
  });

  it("getBackendDesign() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultBackendDesign(API_DESIGN);
    const record = await createBackendDesign({ apiDesignId: API_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);

    expect((await getBackendDesign(record.id, store))?.apiDesignId).toBe(API_DESIGN.id);
    expect(await getBackendDesign("does-not-exist", store)).toBeNull();
  });

  it("listBackendDesigns() returns entries newest first", async () => {
    const content = buildDefaultBackendDesign(API_DESIGN);
    await createBackendDesign({ apiDesignId: API_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    await createBackendDesign({ apiDesignId: "api-design-other", planId: PLAN.id, content, simulated: true }, store);

    const records = await listBackendDesigns(store);
    expect(records.map((r) => r.apiDesignId)).toEqual(["api-design-other", API_DESIGN.id]);
  });

  it("listBackendDesignsForApiDesign() filters to only the given API design's backend designs", async () => {
    const content = buildDefaultBackendDesign(API_DESIGN);
    await createBackendDesign({ apiDesignId: "api-a", planId: PLAN.id, content, simulated: true }, store);
    await createBackendDesign({ apiDesignId: "api-b", planId: PLAN.id, content, simulated: true }, store);
    await createBackendDesign({ apiDesignId: "api-a", planId: PLAN.id, content, simulated: true }, store);

    expect(await listBackendDesignsForApiDesign("api-a", store)).toHaveLength(2);
    expect(await listBackendDesignsForApiDesign("api-b", store)).toHaveLength(1);
    expect(await listBackendDesignsForApiDesign("api-c", store)).toHaveLength(0);
  });
});
