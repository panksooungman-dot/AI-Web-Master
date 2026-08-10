import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createBackendCode,
  getBackendCode,
  getLatestBackendCodeForPlan,
  listBackendCodes,
  listBackendCodesForBackendDesign,
} from "../../lib/design/backend-code";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultBackendCode } from "../../lib/design/backend-code-generator";
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

describe("Backend Code Registry — lib/design/backend-code.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "backend-code-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listBackendCodes() returns an empty array before anything is created", async () => {
    expect(await listBackendCodes(store)).toEqual([]);
  });

  it("createBackendCode() assigns an id/createdAt/version(1) and persists to lib/data/design-backend-code.json", async () => {
    const content = buildDefaultBackendCode(BACKEND_DESIGN);
    const record = await createBackendCode(
      { backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.version).toBe(1);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-backend-code.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].backendDesignId).toBe(BACKEND_DESIGN.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("createBackendCode() auto-increments version per backendDesignId, preserving history (no overwrite)", async () => {
    const content = buildDefaultBackendCode(BACKEND_DESIGN);
    const v1 = await createBackendCode({ backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    const v2 = await createBackendCode({ backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(await listBackendCodesForBackendDesign(BACKEND_DESIGN.id, store)).toHaveLength(2);
    expect(v1.id).not.toBe(v2.id);
  });

  it("getBackendCode() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultBackendCode(BACKEND_DESIGN);
    const record = await createBackendCode({ backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);

    expect((await getBackendCode(record.id, store))?.backendDesignId).toBe(BACKEND_DESIGN.id);
    expect(await getBackendCode("does-not-exist", store)).toBeNull();
  });

  it("listBackendCodes() returns entries newest first", async () => {
    const content = buildDefaultBackendCode(BACKEND_DESIGN);
    await createBackendCode({ backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    await createBackendCode({ backendDesignId: "backend-design-other", planId: PLAN.id, content, simulated: true }, store);

    const records = await listBackendCodes(store);
    expect(records.map((r) => r.backendDesignId)).toEqual(["backend-design-other", BACKEND_DESIGN.id]);
  });

  it("listBackendCodesForBackendDesign() filters to only the given backend design's code", async () => {
    const content = buildDefaultBackendCode(BACKEND_DESIGN);
    await createBackendCode({ backendDesignId: "backend-a", planId: PLAN.id, content, simulated: true }, store);
    await createBackendCode({ backendDesignId: "backend-b", planId: PLAN.id, content, simulated: true }, store);
    await createBackendCode({ backendDesignId: "backend-a", planId: PLAN.id, content, simulated: true }, store);

    expect(await listBackendCodesForBackendDesign("backend-a", store)).toHaveLength(2);
    expect(await listBackendCodesForBackendDesign("backend-b", store)).toHaveLength(1);
    expect(await listBackendCodesForBackendDesign("backend-c", store)).toHaveLength(0);
  });

  it("getLatestBackendCodeForPlan() returns the newest record for that plan, null when none exists", async () => {
    const content = buildDefaultBackendCode(BACKEND_DESIGN);
    expect(await getLatestBackendCodeForPlan(PLAN.id, store)).toBeNull();

    await createBackendCode({ backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    const v2 = await createBackendCode({ backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);

    const latest = await getLatestBackendCodeForPlan(PLAN.id, store);
    expect(latest?.id).toBe(v2.id);
    expect(await getLatestBackendCodeForPlan("no-such-plan", store)).toBeNull();
  });
});
