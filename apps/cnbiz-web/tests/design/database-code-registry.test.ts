import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabaseCode,
  getDatabaseCode,
  getLatestDatabaseCodeForPlan,
  listDatabaseCodes,
  listDatabaseCodesForDatabaseDesign,
} from "../../lib/design/database-code";
import { createFsStore } from "../../lib/db/fsStore";
import { buildDefaultDatabaseCode } from "../../lib/design/database-code-generator";
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

describe("Database Code Registry — lib/design/database-code.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "database-code-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listDatabaseCodes() returns an empty array before anything is created", async () => {
    expect(await listDatabaseCodes(store)).toEqual([]);
  });

  it("createDatabaseCode() assigns an id/createdAt/version(1) and persists to lib/data/design-database-code.json", async () => {
    const content = buildDefaultDatabaseCode(DATABASE_DESIGN);
    const record = await createDatabaseCode(
      { databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.version).toBe(1);

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-database-code.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
    expect(raw[0].databaseDesignId).toBe(DATABASE_DESIGN.id);
    expect(raw[0].planId).toBe(PLAN.id);
  });

  it("createDatabaseCode() auto-increments version per databaseDesignId, preserving history (no overwrite)", async () => {
    const content = buildDefaultDatabaseCode(DATABASE_DESIGN);
    const v1 = await createDatabaseCode({ databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    const v2 = await createDatabaseCode({ databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(await listDatabaseCodesForDatabaseDesign(DATABASE_DESIGN.id, store)).toHaveLength(2);
    expect(v1.id).not.toBe(v2.id);
  });

  it("getDatabaseCode() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultDatabaseCode(DATABASE_DESIGN);
    const record = await createDatabaseCode({ databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);

    expect((await getDatabaseCode(record.id, store))?.databaseDesignId).toBe(DATABASE_DESIGN.id);
    expect(await getDatabaseCode("does-not-exist", store)).toBeNull();
  });

  it("listDatabaseCodes() returns entries newest first", async () => {
    const content = buildDefaultDatabaseCode(DATABASE_DESIGN);
    await createDatabaseCode({ databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    await createDatabaseCode({ databaseDesignId: "database-design-other", planId: PLAN.id, content, simulated: true }, store);

    const records = await listDatabaseCodes(store);
    expect(records.map((r) => r.databaseDesignId)).toEqual(["database-design-other", DATABASE_DESIGN.id]);
  });

  it("listDatabaseCodesForDatabaseDesign() filters to only the given database design's code", async () => {
    const content = buildDefaultDatabaseCode(DATABASE_DESIGN);
    await createDatabaseCode({ databaseDesignId: "db-a", planId: PLAN.id, content, simulated: true }, store);
    await createDatabaseCode({ databaseDesignId: "db-b", planId: PLAN.id, content, simulated: true }, store);
    await createDatabaseCode({ databaseDesignId: "db-a", planId: PLAN.id, content, simulated: true }, store);

    expect(await listDatabaseCodesForDatabaseDesign("db-a", store)).toHaveLength(2);
    expect(await listDatabaseCodesForDatabaseDesign("db-b", store)).toHaveLength(1);
    expect(await listDatabaseCodesForDatabaseDesign("db-c", store)).toHaveLength(0);
  });

  it("getLatestDatabaseCodeForPlan() returns the newest record for that plan, null when none exists", async () => {
    const content = buildDefaultDatabaseCode(DATABASE_DESIGN);
    expect(await getLatestDatabaseCodeForPlan(PLAN.id, store)).toBeNull();

    await createDatabaseCode({ databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    const v2 = await createDatabaseCode({ databaseDesignId: DATABASE_DESIGN.id, planId: PLAN.id, content, simulated: true }, store);
    await createDatabaseCode({ databaseDesignId: "other-db-design", planId: "other-plan", content, simulated: true }, store);

    const latest = await getLatestDatabaseCodeForPlan(PLAN.id, store);
    expect(latest?.id).toBe(v2.id);
    expect(await getLatestDatabaseCodeForPlan("other-plan", store)).not.toBeNull();
    expect(await getLatestDatabaseCodeForPlan("no-such-plan", store)).toBeNull();
  });
});
