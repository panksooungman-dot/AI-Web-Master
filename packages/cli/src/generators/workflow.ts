import path from "path";
import { assertValidName, generateFromTemplate, toPascalCase } from "./template.js";
import type { GenerateResult } from "./agent.js";

export interface GenerateWorkflowOptions {
  name: string;
  cwd?: string;
  description?: string;
  author?: string;
  version?: string;
}

export async function generateWorkflow(options: GenerateWorkflowOptions): Promise<GenerateResult> {
  const {
    name,
    cwd = process.cwd(),
    description = "TODO — describe what this workflow does",
    author = "AI Business OS",
    version = "1.0.0"
  } = options;
  assertValidName(name);

  const targetDir = path.join(cwd, "workflows", name);
  const now = new Date();

  const files = await generateFromTemplate({
    templateType: "workflow",
    targetDir,
    variables: {
      name,
      className: toPascalCase(name),
      description,
      author,
      version,
      createdAt: now.toISOString(),
      createdAtDate: now.toISOString().slice(0, 10)
    }
  });

  return { name, targetDir, files };
}
