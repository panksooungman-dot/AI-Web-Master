import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestCode,
  getLatestTestCodeForPlan,
  getTestCode,
  listTestCodes,
  listTestCodesForTestPlan,
} from "../../lib/design/test-code";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultTestCode } from "../../lib/design/test-code-generator";
import { buildDefaultTestPlan } from "../../lib/design/testplan-design-generator";
import { buildDefaultBackendDesign } from "../../lib/design/backend-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { ApiDesignRecord } from "../../lib/design/api-design";
import type { BackendDesignRecord } from "../../lib/design/backend-design";
import type { DatabaseDesignRecord } from "../../lib/design/database-design";
import type { TestPlanRecord } from "../../lib/design/testplan-design";
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

const TEST_PLAN: TestPlanRecord = {
  id: "test-plan-acme",
  backendDesignId: BACKEND_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultTestPlan(BACKEND_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Test Code Registry — lib/design/test-code.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-code-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listTestCodes() returns an empty array before anything is created", async () => {
    expect(await listTestCodes(store)).toEqual([]);
  });

  it("createTestCode() assigns an id/createdAt/version(1) and persists to lib/data/design-test-code.json", async () => {
    const content = buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN);
    const record = await createTestCode(
      { testPlanId: TEST_PLAN.id, backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.version).toBe(1);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-test-code.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].testPlanId).toBe(TEST_PLAN.id);
    expect(raw[0].backendCodeId).toBe("backend-code-1");
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("createTestCode() auto-increments version per testPlanId, preserving history (no overwrite)", async () => {
    const content = buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN);
    const v1 = await createTestCode(
      { testPlanId: TEST_PLAN.id, backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true },
      store
    );
    const v2 = await createTestCode(
      { testPlanId: TEST_PLAN.id, backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true },
      store
    );

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(await listTestCodesForTestPlan(TEST_PLAN.id, store)).toHaveLength(2);
    expect(v1.id).not.toBe(v2.id);
  });

  it("getTestCode() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN);
    const record = await createTestCode(
      { testPlanId: TEST_PLAN.id, backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true },
      store
    );

    expect((await getTestCode(record.id, store))?.testPlanId).toBe(TEST_PLAN.id);
    expect(await getTestCode("does-not-exist", store)).toBeNull();
  });

  it("listTestCodes() returns entries newest first", async () => {
    const content = buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN);
    await createTestCode({ testPlanId: TEST_PLAN.id, backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true }, store);
    await createTestCode({ testPlanId: "test-plan-other", backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true }, store);

    const records = await listTestCodes(store);
    expect(records.map((r) => r.testPlanId)).toEqual(["test-plan-other", TEST_PLAN.id]);
  });

  it("listTestCodesForTestPlan() filters to only the given test plan's code", async () => {
    const content = buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN);
    await createTestCode({ testPlanId: "plan-a", backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true }, store);
    await createTestCode({ testPlanId: "plan-b", backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true }, store);
    await createTestCode({ testPlanId: "plan-a", backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true }, store);

    expect(await listTestCodesForTestPlan("plan-a", store)).toHaveLength(2);
    expect(await listTestCodesForTestPlan("plan-b", store)).toHaveLength(1);
    expect(await listTestCodesForTestPlan("plan-c", store)).toHaveLength(0);
  });

  it("getLatestTestCodeForPlan() returns the newest record for that plan, null when none exists", async () => {
    const content = buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN);
    expect(await getLatestTestCodeForPlan(PLAN.id, store)).toBeNull();

    await createTestCode({ testPlanId: TEST_PLAN.id, backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true }, store);
    const v2 = await createTestCode(
      { testPlanId: TEST_PLAN.id, backendCodeId: "backend-code-1", planId: PLAN.id, content, simulated: true },
      store
    );

    const latest = await getLatestTestCodeForPlan(PLAN.id, store);
    expect(latest?.id).toBe(v2.id);
    expect(await getLatestTestCodeForPlan("no-such-plan", store)).toBeNull();
  });
});
