import fs from "fs-extra";
import path from "path";
import { WorkflowError, type WorkflowDefinition } from "./types.js";
import { validateWorkflowJson } from "./validator.js";

/** workflows/<name> 를 우선 찾고, 없으면 marketplace/workflows/<name> 로 폴백한다. */
async function resolveWorkflowDir(name: string, cwd: string): Promise<string> {
  const localDir = path.join(cwd, "workflows", name);
  if (await fs.pathExists(localDir)) {
    return localDir;
  }

  const marketplaceDir = path.join(cwd, "marketplace", "workflows", name);
  if (await fs.pathExists(marketplaceDir)) {
    return marketplaceDir;
  }

  throw new WorkflowError(
    "NOT_FOUND",
    `Workflow "${name}" was not found in workflows/${name} or marketplace/workflows/${name}.`
  );
}

/** workflows/<name> 또는 marketplace/workflows/<name> 에서 workflow.json을 로드·검증한다. */
export async function loadWorkflow(name: string, cwd: string = process.cwd()): Promise<WorkflowDefinition> {
  const dir = await resolveWorkflowDir(name, cwd);
  const file = path.join(dir, "workflow.json");

  if (!(await fs.pathExists(file))) {
    throw new WorkflowError("MISSING_FILE", `Workflow "${name}" is missing required file: ${file}`);
  }

  const raw = await fs.readJson(file);
  const { name: workflowName, version, steps } = validateWorkflowJson(raw, file);

  return { name: workflowName, version, steps, dir };
}
