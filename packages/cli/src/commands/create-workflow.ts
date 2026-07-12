import path from "path";
import chalk from "chalk";
import { generateWorkflow } from "../generators/workflow.js";

export async function createWorkflowCommand(name: string): Promise<void> {
  if (!name) {
    console.log(chalk.red("❌ Workflow name is required."));
    console.log(chalk.yellow("Usage: ai create workflow <name>"));
    process.exit(1);
  }

  try {
    const result = await generateWorkflow({ name });

    console.log(chalk.green(`✅ Workflow "${name}" created successfully.`));
    console.log(chalk.gray(`📁 ${result.targetDir}`));
    for (const file of result.files) {
      console.log(chalk.gray(`   - ${path.relative(result.targetDir, file)}`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Failed to create workflow "${name}".`));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}
