import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createCrudFrontend,
  getCrudFrontend,
  getLatestCrudFrontendForPlan,
  listCrudFrontends,
  listCrudFrontendsForApiCode,
} from "../../lib/design/crud-frontend";
import { createFsStore } from "../../lib/db/fsStore";
import { generateCrudFrontend } from "../../lib/design/crud-frontend-generator";
import { buildDefaultBackendDesign } from "../../lib/design/backend-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { ApiDesignRecord } from "../../lib/design/api-design";
import type { BackendDesignRecord } from "../../lib/design/backend-design";
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

const BACKEND_DESIGN: BackendDesignRecord = {
  id: "backend-design-acme",
  apiDesignId: API_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultBackendDesign(API_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("CRUD Frontend Registry — lib/design/crud-frontend.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "crud-frontend-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listCrudFrontends() returns an empty array before anything is created", async () => {
    expect(await listCrudFrontends(store)).toEqual([]);
  });

  it("createCrudFrontend() assigns an id/createdAt/version(1) and persists to lib/data/design-crud-frontend.json", async () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    const record = await createCrudFrontend(
      { apiCodeId: "api-code-1", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.version).toBe(1);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-crud-frontend.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].apiCodeId).toBe("api-code-1");
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("createCrudFrontend() auto-increments version per apiCodeId, preserving history (no overwrite)", async () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    const v1 = await createCrudFrontend(
      { apiCodeId: "api-code-1", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content },
      store
    );
    const v2 = await createCrudFrontend(
      { apiCodeId: "api-code-1", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content },
      store
    );

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(await listCrudFrontendsForApiCode("api-code-1", store)).toHaveLength(2);
    expect(v1.id).not.toBe(v2.id);
  });

  it("getCrudFrontend() finds a record by id, null for unknown id", async () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    const record = await createCrudFrontend(
      { apiCodeId: "api-code-1", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content },
      store
    );

    expect((await getCrudFrontend(record.id, store))?.apiCodeId).toBe("api-code-1");
    expect(await getCrudFrontend("does-not-exist", store)).toBeNull();
  });

  it("listCrudFrontends() returns entries newest first", async () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    await createCrudFrontend({ apiCodeId: "api-code-1", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content }, store);
    await createCrudFrontend(
      { apiCodeId: "api-code-other", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content },
      store
    );

    const records = await listCrudFrontends(store);
    expect(records.map((r) => r.apiCodeId)).toEqual(["api-code-other", "api-code-1"]);
  });

  it("listCrudFrontendsForApiCode() filters to only the given API Code's CRUD Frontend", async () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    await createCrudFrontend({ apiCodeId: "api-a", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content }, store);
    await createCrudFrontend({ apiCodeId: "api-b", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content }, store);
    await createCrudFrontend({ apiCodeId: "api-a", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content }, store);

    expect(await listCrudFrontendsForApiCode("api-a", store)).toHaveLength(2);
    expect(await listCrudFrontendsForApiCode("api-b", store)).toHaveLength(1);
    expect(await listCrudFrontendsForApiCode("api-c", store)).toHaveLength(0);
  });

  it("getLatestCrudFrontendForPlan() returns the newest record for that plan, null when none exists", async () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    expect(await getLatestCrudFrontendForPlan(PLAN.id, store)).toBeNull();

    await createCrudFrontend({ apiCodeId: "api-code-1", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content }, store);
    const v2 = await createCrudFrontend(
      { apiCodeId: "api-code-1", databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content },
      store
    );

    const latest = await getLatestCrudFrontendForPlan(PLAN.id, store);
    expect(latest?.id).toBe(v2.id);
    expect(await getLatestCrudFrontendForPlan("no-such-plan", store)).toBeNull();
  });
});
