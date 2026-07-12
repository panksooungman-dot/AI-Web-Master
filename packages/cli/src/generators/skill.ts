import path from "path";
import { assertValidName, generateFromTemplate, toPascalCase } from "./template.js";
import type { GenerateResult } from "./agent.js";

export interface GenerateSkillOptions {
  name: string;
  cwd?: string;
  description?: string;
  author?: string;
  version?: string;
}

export async function generateSkill(options: GenerateSkillOptions): Promise<GenerateResult> {
  const {
    name,
    cwd = process.cwd(),
    description = "TODO — one-line description of what this skill does",
    author = "AI Business OS",
    version = "1.0.0"
  } = options;
  assertValidName(name);

  const targetDir = path.join(cwd, "skills", name);
  const now = new Date();

  const files = await generateFromTemplate({
    templateType: "skill",
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
