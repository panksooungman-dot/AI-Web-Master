import { describe, expect, it } from "vitest";
import { validateWorkflowJson } from "../../packages/cli/src/workflow/validator.js";
import { WorkflowError } from "../../packages/cli/src/workflow/types.js";

describe("Workflow Engine — validateWorkflowJson() (packages/cli/src/workflow/validator.ts)", () => {
  const VALID_WORKFLOW = {
    name: "website-builder",
    version: "1.0.0",
    steps: [{ agent: "business-analyst" }, { agent: "site-planner" }]
  };

  it("accepts a well-formed workflow.json and returns it typed", () => {
    const result = validateWorkflowJson(VALID_WORKFLOW, "workflow.json");

    expect(result.name).toBe("website-builder");
    expect(result.version).toBe("1.0.0");
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].agent).toBe("business-analyst");
  });

  it("rejects a non-object payload", () => {
    expect(() => validateWorkflowJson(null, "workflow.json")).toThrow(WorkflowError);
    expect(() => validateWorkflowJson("not-json", "workflow.json")).toThrow(WorkflowError);
  });

  it("rejects a missing or empty \"name\"", () => {
    try {
      validateWorkflowJson({ ...VALID_WORKFLOW, name: "" }, "workflow.json");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowError);
      expect((error as InstanceType<typeof WorkflowError>).code).toBe("INVALID_METADATA");
    }
  });

  it("rejects a non-semver \"version\"", () => {
    try {
      validateWorkflowJson({ ...VALID_WORKFLOW, version: "v1" }, "workflow.json");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowError);
      expect((error as InstanceType<typeof WorkflowError>).code).toBe("INVALID_VERSION");
    }
  });

  it("rejects \"steps\" that is not an array", () => {
    try {
      validateWorkflowJson({ ...VALID_WORKFLOW, steps: "nope" }, "workflow.json");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowError);
      expect((error as InstanceType<typeof WorkflowError>).code).toBe("INVALID_STEP");
    }
  });

  it("rejects a step with a missing/empty \"agent\" field", () => {
    try {
      validateWorkflowJson({ ...VALID_WORKFLOW, steps: [{ agent: "  " }] }, "workflow.json");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowError);
      expect((error as InstanceType<typeof WorkflowError>).code).toBe("INVALID_STEP");
    }
  });

  it("includes the provided sourceHint in the error message for traceability", () => {
    try {
      validateWorkflowJson({}, "agents/foo/workflow.json");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as Error).message).toContain("agents/foo/workflow.json");
    }
  });
});
