import fs from "fs-extra";
import path from "path";
import { generateWorkflow } from "../generators/workflow.js";
import { WEBSITE_PIPELINE_AGENTS } from "./agents.js";

export const WEBSITE_WORKFLOW_NAME = "website-builder";

/**
 * website-builder Workflow가 없으면 Generator(generateWorkflow)로 생성한 뒤
 * 8단계 파이프라인으로 workflow.json을 채운다. 이미 존재하면 건드리지 않는다.
 */
export async function ensureWebsiteWorkflow(cwd: string): Promise<void> {
  const dir = path.join(cwd, "workflows", WEBSITE_WORKFLOW_NAME);
  const workflowJsonPath = path.join(dir, "workflow.json");

  if (await fs.pathExists(workflowJsonPath)) {
    return;
  }

  await generateWorkflow({ name: WEBSITE_WORKFLOW_NAME, cwd });

  await fs.writeJson(
    workflowJsonPath,
    {
      name: WEBSITE_WORKFLOW_NAME,
      version: "1.0.0",
      steps: WEBSITE_PIPELINE_AGENTS.map((agent) => ({ agent }))
    },
    { spaces: 2 }
  );
}
