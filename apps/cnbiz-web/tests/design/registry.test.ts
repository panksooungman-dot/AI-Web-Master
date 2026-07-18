import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "design-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listDesignPlans() returns an empty array before anything is created", () => {
    expect(listDesignPlans(baseDir)).toEqual([]);
  });

  it("createDesignPlan() assigns an id/createdAt and persists to lib/data/design-plans.json", () => {
    const content = buildDefaultDesignPlan(INPUT);
    const record = createDesignPlan({ input: INPUT, content, simulated: true }, baseDir);

    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "design-plans.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
  });

  it("getDesignPlan() finds a record by id, null for unknown id", () => {
    const content = buildDefaultDesignPlan(INPUT);
    const record = createDesignPlan({ input: INPUT, content, simulated: true }, baseDir);

    expect(getDesignPlan(record.id, baseDir)?.input.projectName).toBe("Acme Site");
    expect(getDesignPlan("does-not-exist", baseDir)).toBeNull();
  });

  it("listDesignPlans() returns entries newest first", () => {
    const content = buildDefaultDesignPlan(INPUT);
    createDesignPlan({ input: { ...INPUT, projectName: "First" }, content, simulated: true }, baseDir);
    createDesignPlan({ input: { ...INPUT, projectName: "Second" }, content, simulated: true }, baseDir);

    const plans = listDesignPlans(baseDir);
    expect(plans.map((p) => p.input.projectName)).toEqual(["Second", "First"]);
  });

  it("preserves provider/model metadata when provided", () => {
    const content = buildDefaultDesignPlan(INPUT);
    const record = createDesignPlan(
      { input: INPUT, content, simulated: false, provider: "openai", model: "gpt-4o-mini" },
      baseDir
    );

    expect(record.provider).toBe("openai");
    expect(record.model).toBe("gpt-4o-mini");
  });
});
