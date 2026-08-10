import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createApiCode,
  getApiCode,
  getLatestApiCodeForPlan,
  listApiCodes,
  listApiCodesForBackendCode,
} from "../../lib/design/api-code";
import { createFsStore } from "../../lib/db/fsStore";
import { generateApiCode } from "../../lib/design/api-code-generator";
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

describe("API Code Registry — lib/design/api-code.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-code-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listApiCodes() returns an empty array before anything is created", async () => {
    expect(await listApiCodes(store)).toEqual([]);
  });

  it("createApiCode() assigns an id/createdAt/version(1) and persists to lib/data/design-api-code.json", async () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    const record = await createApiCode({ backendCodeId: "backend-code-1", planId: PLAN.id, content }, store);

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.version).toBe(1);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-api-code.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].backendCodeId).toBe("backend-code-1");
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("createApiCode() auto-increments version per backendCodeId, preserving history (no overwrite)", async () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    const v1 = await createApiCode({ backendCodeId: "backend-code-1", planId: PLAN.id, content }, store);
    const v2 = await createApiCode({ backendCodeId: "backend-code-1", planId: PLAN.id, content }, store);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(await listApiCodesForBackendCode("backend-code-1", store)).toHaveLength(2);
    expect(v1.id).not.toBe(v2.id);
  });

  it("getApiCode() finds a record by id, null for unknown id", async () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    const record = await createApiCode({ backendCodeId: "backend-code-1", planId: PLAN.id, content }, store);

    expect((await getApiCode(record.id, store))?.backendCodeId).toBe("backend-code-1");
    expect(await getApiCode("does-not-exist", store)).toBeNull();
  });

  it("listApiCodes() returns entries newest first", async () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    await createApiCode({ backendCodeId: "backend-code-1", planId: PLAN.id, content }, store);
    await createApiCode({ backendCodeId: "backend-code-other", planId: PLAN.id, content }, store);

    const records = await listApiCodes(store);
    expect(records.map((r) => r.backendCodeId)).toEqual(["backend-code-other", "backend-code-1"]);
  });

  it("listApiCodesForBackendCode() filters to only the given backend code's API code", async () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    await createApiCode({ backendCodeId: "backend-a", planId: PLAN.id, content }, store);
    await createApiCode({ backendCodeId: "backend-b", planId: PLAN.id, content }, store);
    await createApiCode({ backendCodeId: "backend-a", planId: PLAN.id, content }, store);

    expect(await listApiCodesForBackendCode("backend-a", store)).toHaveLength(2);
    expect(await listApiCodesForBackendCode("backend-b", store)).toHaveLength(1);
    expect(await listApiCodesForBackendCode("backend-c", store)).toHaveLength(0);
  });

  it("getLatestApiCodeForPlan() returns the newest record for that plan, null when none exists", async () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    expect(await getLatestApiCodeForPlan(PLAN.id, store)).toBeNull();

    await createApiCode({ backendCodeId: "backend-code-1", planId: PLAN.id, content }, store);
    const v2 = await createApiCode({ backendCodeId: "backend-code-1", planId: PLAN.id, content }, store);

    const latest = await getLatestApiCodeForPlan(PLAN.id, store);
    expect(latest?.id).toBe(v2.id);
    expect(await getLatestApiCodeForPlan("no-such-plan", store)).toBeNull();
  });
});
