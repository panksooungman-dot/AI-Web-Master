import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createWorkflow, getWorkflow, listWorkflows } from "../../lib/workflows/registry";
import type { WorkflowStepDefinition } from "../../lib/workflows/types";

const STEPS: WorkflowStepDefinition[] = [{ id: "git-init", kind: "git-init", params: {} }];

describe("Workflow Registry — lib/workflows/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listWorkflows() returns an empty array before anything is created", async () => {
    expect(await listWorkflows(store)).toEqual([]);
  });

  it("createWorkflow() persists a record retrievable via listWorkflows()/getWorkflow()", async () => {
    const workflow = await createWorkflow("New Project", "desc", STEPS, store);

    expect(workflow.id).toBeTruthy();
    expect(await listWorkflows(store)).toHaveLength(1);
    expect((await getWorkflow(workflow.id, store))?.name).toBe("New Project");
  });

  it("getWorkflow() returns undefined for an unknown id", async () => {
    expect(await getWorkflow("does-not-exist", store)).toBeUndefined();
  });
});
