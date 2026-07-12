import path from "path";
import { assertValidName, generateFromTemplate, toPascalCase } from "./template.js";

export interface GenerateAgentOptions {
  name: string;
  cwd?: string;
  description?: string;
  author?: string;
  version?: string;
}

export interface GenerateResult {
  name: string;
  targetDir: string;
  files: string[];
}

export async function generateAgent(options: GenerateAgentOptions): Promise<GenerateResult> {
  const {
    name,
    cwd = process.cwd(),
    description = "TODO — describe what this agent does",
    author = "AI Business OS",
    version = "1.0.0"
  } = options;
  assertValidName(name);

  const targetDir = path.join(cwd, "agents", name);
  const now = new Date();

  const files = await generateFromTemplate({
    templateType: "agent",
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
