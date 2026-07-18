import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createDesignPlan, getDesignPlan, listDesignPlans } from "../../lib/design/registry";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput } from "../../lib/design/types";

const INPUT: DesignPlanInput = {
  projectName: "Acme Site",
  projectType: "corporate",
  requirements: "Need a corporate site.",
  targetUsers: "B2B buyers",
};

describe("Design Registry — lib/design/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listDesignPlans() returns an empty array before anything is created", async () => {
    expect(await listDesignPlans(store)).toEqual([]);
  });

  it("createDesignPlan() assigns an id/createdAt and persists to lib/data/design-plans.json", async () => {
    const content = buildDefaultDesignPlan(INPUT);
    const record = await createDesignPlan({ input: INPUT, content, simulated: true }, store);

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-plans.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
  });

  it("getDesignPlan() finds a record by id, null for unknown id", async () => {
    const content = buildDefaultDesignPlan(INPUT);
    const record = await createDesignPlan({ input: INPUT, content, simulated: true }, store);

    expect((await getDesignPlan(record.id, store))?.input.projectName).toBe("Acme Site");
    expect(await getDesignPlan("does-not-exist", store)).toBeNull();
  });

  it("listDesignPlans() returns entries newest first", async () => {
    const content = buildDefaultDesignPlan(INPUT);
    await createDesignPlan({ input: { ...INPUT, projectName: "First" }, content, simulated: true }, store);
    await createDesignPlan({ input: { ...INPUT, projectName: "Second" }, content, simulated: true }, store);

    const plans = await listDesignPlans(store);
    expect(plans.map((p) => p.input.projectName)).toEqual(["Second", "First"]);
  });

  it("preserves provider/model metadata when provided", async () => {
    const content = buildDefaultDesignPlan(INPUT);
    const record = await createDesignPlan(
      { input: INPUT, content, simulated: false, provider: "openai", model: "gpt-4o-mini" },
      store
    );

    expect(record.provider).toBe("openai");
    expect(record.model).toBe("gpt-4o-mini");
  });
});
