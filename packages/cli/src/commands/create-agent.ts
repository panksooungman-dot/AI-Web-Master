import path from "path";
import chalk from "chalk";
import { generateAgent } from "../generators/agent.js";

export async function createAgentCommand(name: string): Promise<void> {
  if (!name) {
    console.log(chalk.red("❌ Agent name is required."));
    console.log(chalk.yellow("Usage: ai create agent <name>"));
    process.exit(1);
  }

  try {
    const result = await generateAgent({ name });

    console.log(chalk.green(`✅ Agent "${name}" created successfully.`));
    console.log(chalk.gray(`📁 ${result.targetDir}`));
    for (const file of result.files) {
      console.log(chalk.gray(`   - ${path.relative(result.targetDir, file)}`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Failed to create agent "${name}".`));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}
