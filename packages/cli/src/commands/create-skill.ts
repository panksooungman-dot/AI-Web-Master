import path from "path";
import chalk from "chalk";
import { generateSkill } from "../generators/skill.js";

export async function createSkillCommand(name: string): Promise<void> {
  if (!name) {
    console.log(chalk.red("❌ Skill name is required."));
    console.log(chalk.yellow("Usage: ai create skill <name>"));
    process.exit(1);
  }

  try {
    const result = await generateSkill({ name });

    console.log(chalk.green(`✅ Skill "${name}" created successfully.`));
    console.log(chalk.gray(`📁 ${result.targetDir}`));
    for (const file of result.files) {
      console.log(chalk.gray(`   - ${path.relative(result.targetDir, file)}`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Failed to create skill "${name}".`));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}
