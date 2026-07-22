import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  getDesignDocument,
  getLatestDesignDocument,
  listDesignDocuments,
  listDesignDocumentsForProject,
  saveDesignDocument,
  updateDesignDocument,
} from "../../lib/design/design-document-registry";
import { planToDesignDocument } from "../../lib/design/design-document-adapter";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";

const PLAN_INPUT: DesignPlanInput = {
  projectName: "Bright Smile Dental",
  projectType: "치과 웹사이트",
  requirements: "온라인 예약, 진료 안내가 필요합니다.",
  targetUsers: "지역 주민, 30~50대",
};

function buildPlan(id: string): DesignPlanRecord {
  return {
    id,
    input: PLAN_INPUT,
    content: buildDefaultDesignPlan(PLAN_INPUT),
    simulated: true,
    createdAt: new Date().toISOString(),
  };
}

describe("Design Document Registry — lib/design/design-document-registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-document-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listDesignDocuments() returns an empty array before anything is saved", async () => {
    expect(await listDesignDocuments(store)).toEqual([]);
  });

  it("saveDesignDocument() assigns an id, version 1, status 'current' by default, and persists to lib/data/design-documents.json", async () => {
    const plan = buildPlan("plan-1");
    const document = planToDesignDocument(plan);

    const record = await saveDesignDocument({ projectId: plan.id, document }, store);

    expect(record.id).toBeTruthy();
    expect(record.projectId).toBe("plan-1");
    expect(record.version).toBe(1);
    expect(record.status).toBe("current");
    expect(record.document).toEqual(document);
    expect(record.createdAt).toBeTruthy();
    expect(record.updatedAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-documents.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
  });

  it("a second save for the same projectId increments version and does not overwrite the first (append-only history)", async () => {
    const plan = buildPlan("plan-1");
    const first = await saveDesignDocument({ projectId: plan.id, document: planToDesignDocument(plan) }, store);
    const second = await saveDesignDocument({ projectId: plan.id, document: planToDesignDocument(plan) }, store);

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(first.id).not.toBe(second.id);

    const history = await listDesignDocumentsForProject(plan.id, store);
    expect(history).toHaveLength(2);
  });

  it("getLatestDesignDocument() returns the highest-version record for a project, or null if none exists", async () => {
    const plan = buildPlan("plan-1");
    expect(await getLatestDesignDocument(plan.id, store)).toBeNull();

    await saveDesignDocument({ projectId: plan.id, document: planToDesignDocument(plan) }, store);
    const second = await saveDesignDocument({ projectId: plan.id, document: planToDesignDocument(plan) }, store);

    const latest = await getLatestDesignDocument(plan.id, store);
    expect(latest?.id).toBe(second.id);
    expect(latest?.version).toBe(2);
  });

  it("getDesignDocument() finds a record by id, null for unknown id", async () => {
    const plan = buildPlan("plan-1");
    const record = await saveDesignDocument({ projectId: plan.id, document: planToDesignDocument(plan) }, store);

    expect((await getDesignDocument(record.id, store))?.projectId).toBe("plan-1");
    expect(await getDesignDocument("does-not-exist", store)).toBeNull();
  });

  it("keeps documents from different projects independent", async () => {
    const planA = buildPlan("plan-a");
    const planB = buildPlan("plan-b");

    await saveDesignDocument({ projectId: planA.id, document: planToDesignDocument(planA) }, store);
    await saveDesignDocument({ projectId: planB.id, document: planToDesignDocument(planB) }, store);
    await saveDesignDocument({ projectId: planA.id, document: planToDesignDocument(planA) }, store);

    expect(await listDesignDocumentsForProject(planA.id, store)).toHaveLength(2);
    expect(await listDesignDocumentsForProject(planB.id, store)).toHaveLength(1);
    expect(await listDesignDocuments(store)).toHaveLength(3);
  });

  it("updateDesignDocument() appends a new version rather than mutating the previous one", async () => {
    const plan = buildPlan("plan-1");
    const original = planToDesignDocument(plan);
    const first = await saveDesignDocument({ projectId: plan.id, document: original }, store);

    const changed = { ...original, metadata: { ...original.metadata, projectName: "Renamed" } };
    const updated = await updateDesignDocument(plan.id, changed, store);

    expect(updated.version).toBe(2);
    expect(updated.document.metadata.projectName).toBe("Renamed");

    // The original version 1 record is untouched.
    const history = await listDesignDocumentsForProject(plan.id, store);
    expect(history.find((r) => r.id === first.id)?.document.metadata.projectName).toBe(original.metadata.projectName);
  });

  it("accepts an explicit status override", async () => {
    const plan = buildPlan("plan-1");
    const record = await saveDesignDocument(
      { projectId: plan.id, document: planToDesignDocument(plan), status: "draft" },
      store
    );

    expect(record.status).toBe("draft");
  });
});
