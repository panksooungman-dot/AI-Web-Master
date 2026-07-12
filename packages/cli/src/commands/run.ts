import chalk from "chalk";
import { runAgent } from "../runtime/runtime.js";
import { RuntimeError } from "../runtime/types.js";
import { ProviderError } from "../providers/types.js";
import { PromptError } from "../prompt/types.js";
import { ToolError } from "../tools/types.js";

export interface RunCommandOptions {
  provider?: string;
}

/** `ai run <agent-name> [--provider <id>]` — Agent Runtime 실행 */
export async function runCommand(name: string, options: RunCommandOptions = {}): Promise<void> {
  if (!name) {
    console.log(chalk.red("❌ Agent name is required."));
    console.log(chalk.yellow("Usage: ai run <agent-name> [--provider <id>]"));
    process.exit(1);
  }

  try {
    await runAgent(name, { providerId: options.provider });
  } catch (error) {
    if (error instanceof RuntimeError || error instanceof PromptError) {
      console.log(chalk.red(`❌ ${error.message}`));
    } else if (error instanceof ProviderError) {
      console.log(chalk.red(`❌ [${error.provider}] ${error.message}`));
    } else if (error instanceof ToolError) {
      console.log(chalk.red(`❌ [${error.tool}] ${error.message}`));
    } else {
      console.log(chalk.red(`❌ Failed to run agent "${name}".`));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
    process.exit(1);
  }
}
