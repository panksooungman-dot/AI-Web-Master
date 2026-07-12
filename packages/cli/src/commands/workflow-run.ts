import chalk from "chalk";
import { runWorkflow } from "../workflow/runtime.js";
import { WorkflowError } from "../workflow/types.js";
import { ProviderError } from "../providers/types.js";

export interface WorkflowRunCliOptions {
  resume?: boolean;
  retry?: boolean;
  provider?: string;
}

/** `ai workflow run <name>` — Workflow Runtime 실행 */
export async function workflowRunCommand(name: string, options: WorkflowRunCliOptions = {}): Promise<void> {
  if (!name) {
    console.log(chalk.red("❌ Workflow name is required."));
    console.log(chalk.yellow("Usage: ai workflow run <name>"));
    process.exit(1);
  }

  if (options.resume) {
    console.log(chalk.yellow("⚠️ --resume is not implemented yet (placeholder). Running from the start instead."));
  }

  if (options.retry) {
    console.log(chalk.yellow("⚠️ --retry is not implemented yet (placeholder). Running from the start instead."));
  }

  try {
    const result = await runWorkflow(name, { providerId: options.provider });

    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof WorkflowError) {
      console.log(chalk.red(`❌ ${error.message}`));
    } else if (error instanceof ProviderError) {
      console.log(chalk.red(`❌ [${error.provider}] ${error.message}`));
    } else {
      console.log(chalk.red(`❌ Failed to run workflow "${name}".`));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
    process.exit(1);
  }
}
