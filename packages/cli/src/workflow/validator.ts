import { WorkflowError, type WorkflowStepDefinition } from "./types.js";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export interface ValidatedWorkflowJson {
  name: string;
  version: string;
  steps: WorkflowStepDefinition[];
}

/**
 * workflow.json의 구조를 검증한다: name/semver version 존재 여부,
 * steps가 배열인지, 각 step이 비어있지 않은 "agent" 문자열을 갖는지.
 */
export function validateWorkflowJson(raw: unknown, sourceHint: string): ValidatedWorkflowJson {
  if (typeof raw !== "object" || raw === null) {
    throw new WorkflowError("INVALID_METADATA", `Invalid workflow.json at ${sourceHint}: not a JSON object`);
  }

  const data = raw as Record<string, unknown>;

  if (typeof data.name !== "string" || data.name.trim().length === 0) {
    throw new WorkflowError("INVALID_METADATA", `Invalid workflow.json at ${sourceHint}: missing "name"`);
  }

  const version = data.version;
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    throw new WorkflowError(
      "INVALID_VERSION",
      `Invalid workflow.json at ${sourceHint}: version "${String(version)}" must be semver (x.y.z)`
    );
  }

  if (!Array.isArray(data.steps)) {
    throw new WorkflowError("INVALID_STEP", `Invalid workflow.json at ${sourceHint}: "steps" must be an array`);
  }

  const steps = data.steps.map((step, index) => {
    const isValidStep =
      typeof step === "object" &&
      step !== null &&
      typeof (step as Record<string, unknown>).agent === "string" &&
      ((step as Record<string, unknown>).agent as string).trim().length > 0;

    if (!isValidStep) {
      throw new WorkflowError(
        "INVALID_STEP",
        `Invalid workflow.json at ${sourceHint}: steps[${index}] must have a non-empty "agent" string`
      );
    }

    return step as WorkflowStepDefinition;
  });

  return { name: data.name, version, steps };
}
