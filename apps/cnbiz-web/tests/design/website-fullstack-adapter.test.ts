import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyFullStackCode } from "../../lib/design/website-fullstack-adapter";
import { createFsStore } from "../../lib/db/fsStore";
import { createDatabaseCode } from "../../lib/design/database-code";
import { createBackendCode } from "../../lib/design/backend-code";
import { createApiCode } from "../../lib/design/api-code";
import { createTestCode } from "../../lib/design/test-code";
import { buildDefaultDatabaseCode } from "../../lib/design/database-code-generator";
import { buildDefaultBackendCode } from "../../lib/design/backend-code-generator";
import { generateApiCode } from "../../lib/design/api-code-generator";
import { buildDefaultTestCode } from "../../lib/design/test-code-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultBackendDesign } from "../../lib/design/backend-design-generator";
import { buildDefaultTestPlan } from "../../lib/design/testplan-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DatabaseDesignRecord } from "../../lib/design/database-design";
import type { ApiDesignRecord } from "../../lib/design/api-design";
import type { BackendDesignRecord } from "../../lib/design/backend-design";
import type { TestPlanRecord } from "../../lib/design/testplan-design";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";

const PLAN_INPUT: DesignPlanInput = {
  projectName: "Bright Smile Dental",
  projectType: "치과 웹사이트",
  requirements: "온라인 예약, 진료 안내, 오시는 길 안내가 필요합니다.",
  targetUsers: "지역 주민, 30~50대",
};

const PLAN: DesignPlanRecord = {
  id: "design-plan-1",
  input: PLAN_INPUT,
  content: buildDefaultDesignPlan(PLAN_INPUT),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const DATABASE_DESIGN: DatabaseDesignRecord = {
  id: "database-design-1",
  planId: PLAN.id,
  version: 1,
  content: buildDefaultDatabaseDesign(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const API_DESIGN: ApiDesignRecord = {
  id: "api-design-1",
  databaseDesignId: DATABASE_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultApiDesign(DATABASE_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const BACKEND_DESIGN: BackendDesignRecord = {
  id: "backend-design-1",
  apiDesignId: API_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultBackendDesign(API_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const TEST_PLAN: TestPlanRecord = {
  id: "test-plan-1",
  backendDesignId: BACKEND_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultTestPlan(BACKEND_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

describe("Website Fullstack Adapter — applyFullStackCode() (Chain A ↔ Chain B)", () => {
  let dataDir: string;
  let outDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "website-fullstack-data-"));
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), "website-fullstack-out-"));
    store = createFsStore(dataDir);
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it("writes nothing and returns all-null ids when no Chain B artifacts exist for the plan (not an error)", async () => {
    const summary = await applyFullStackCode(outDir, PLAN.id, store);

    expect(summary).toEqual({
      databaseCodeId: null,
      backendCodeId: null,
      apiCodeId: null,
      testCodeId: null,
      filesWritten: [],
      packageChanges: [],
    });
    expect(fs.readdirSync(outDir)).toEqual([]);
  });

  it("writes every Chain B artifact's files to real paths under outDir when all four exist", async () => {
    const databaseCode = await createDatabaseCode(
      { databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content: buildDefaultDatabaseCode(DATABASE_DESIGN), simulated: true },
      store
    );
    const backendCode = await createBackendCode(
      { backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content: buildDefaultBackendCode(BACKEND_DESIGN), simulated: true },
      store
    );
    const apiCode = await createApiCode(
      { backendCodeId: backendCode.id, planId: PLAN.id, content: generateApiCode(BACKEND_DESIGN, API_DESIGN) },
      store
    );
    const testCode = await createTestCode(
      { testPlanId: TEST_PLAN.id, backendCodeId: backendCode.id, planId: PLAN.id, content: buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN), simulated: true },
      store
    );

    const summary = await applyFullStackCode(outDir, PLAN.id, store);

    expect(summary.databaseCodeId).toBe(databaseCode.id);
    expect(summary.backendCodeId).toBe(backendCode.id);
    expect(summary.apiCodeId).toBe(apiCode.id);
    expect(summary.testCodeId).toBe(testCode.id);

    const expectedPaths = [
      ...databaseCode.content.files.map((f) => f.path),
      ...backendCode.content.files.map((f) => f.path),
      ...apiCode.content.files.map((f) => f.path),
      ...testCode.content.files.map((f) => f.path),
    ];
    expect(summary.filesWritten).toEqual(expectedPaths);

    // every written file actually exists on disk with the exact generated content
    for (const file of [...databaseCode.content.files, ...backendCode.content.files, ...apiCode.content.files, ...testCode.content.files]) {
      const absolute = path.join(outDir, file.path);
      expect(fs.existsSync(absolute)).toBe(true);
      expect(fs.readFileSync(absolute, "utf-8")).toBe(file.code);
    }
  });

  it("writes only the artifacts that exist, skipping missing stages without failing", async () => {
    const backendCode = await createBackendCode(
      { backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content: buildDefaultBackendCode(BACKEND_DESIGN), simulated: true },
      store
    );
    // no database-code, api-code, or test-code created for this plan

    const summary = await applyFullStackCode(outDir, PLAN.id, store);

    expect(summary.backendCodeId).toBe(backendCode.id);
    expect(summary.databaseCodeId).toBeNull();
    expect(summary.apiCodeId).toBeNull();
    expect(summary.testCodeId).toBeNull();
    expect(summary.filesWritten).toEqual(backendCode.content.files.map((f) => f.path));
  });

  it("only picks up artifacts for the given planId, ignoring records from other plans", async () => {
    await createBackendCode(
      { backendDesignId: "other-backend-design", planId: "other-plan", content: buildDefaultBackendCode(BACKEND_DESIGN), simulated: true },
      store
    );

    const summary = await applyFullStackCode(outDir, PLAN.id, store);

    expect(summary.backendCodeId).toBeNull();
    expect(summary.filesWritten).toEqual([]);
  });

  it("uses the newest version when multiple Backend Code records exist for the same plan", async () => {
    await createBackendCode(
      { backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content: buildDefaultBackendCode(BACKEND_DESIGN), simulated: true },
      store
    );
    const v2 = await createBackendCode(
      { backendDesignId: BACKEND_DESIGN.id, planId: PLAN.id, content: buildDefaultBackendCode(BACKEND_DESIGN), simulated: true },
      store
    );

    const summary = await applyFullStackCode(outDir, PLAN.id, store);

    expect(summary.backendCodeId).toBe(v2.id);
  });
});
