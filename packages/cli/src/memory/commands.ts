import path from "path";
import chalk from "chalk";
import { clearMemory, getMemory, listMemories } from "./manager.js";
import { exportMemory } from "./exporter.js";
import { MemoryError } from "./types.js";

function handleMemoryError(error: unknown, workflow: string): never {
  if (error instanceof MemoryError) {
    console.log(chalk.red(`❌ ${error.message}`));
  } else {
    console.log(chalk.red(`❌ Failed to load memory for "${workflow}".`));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  }
  process.exit(1);
}

/** `ai memory list` */
export async function memoryListCommand(cwd: string = process.cwd()): Promise<void> {
  const names = await listMemories(cwd);

  if (names.length === 0) {
    console.log(chalk.yellow("⚠️ No memory found. Run `ai workflow run <name>` or `ai run <agent>` first."));
    return;
  }

  names.forEach((name) => console.log(name));
}

/** `ai memory show <workflow>` — pretty JSON 출력 */
export async function memoryShowCommand(workflow: string, cwd: string = process.cwd()): Promise<void> {
  if (!workflow) {
    console.log(chalk.red("❌ Workflow/agent name is required."));
    console.log(chalk.yellow("Usage: ai memory show <workflow>"));
    process.exit(1);
  }

  try {
    const record = await getMemory(cwd, workflow);
    console.log(JSON.stringify(record, null, 2));
  } catch (error) {
    handleMemoryError(error, workflow);
  }
}

/** `ai memory clear <workflow>` */
export async function memoryClearCommand(workflow: string, cwd: string = process.cwd()): Promise<void> {
  if (!workflow) {
    console.log(chalk.red("❌ Workflow/agent name is required."));
    console.log(chalk.yellow("Usage: ai memory clear <workflow>"));
    process.exit(1);
  }

  const removed = await clearMemory(cwd, workflow);

  if (removed) {
    console.log(chalk.green(`✅ Memory for "${workflow}" cleared.`));
  } else {
    console.log(chalk.yellow(`⚠️ No memory found for "${workflow}".`));
  }
}

/** `ai memory export <workflow>` — .runtime/exports/memory-<workflow>.json */
export async function memoryExportCommand(workflow: string, cwd: string = process.cwd()): Promise<void> {
  if (!workflow) {
    console.log(chalk.red("❌ Workflow/agent name is required."));
    console.log(chalk.yellow("Usage: ai memory export <workflow>"));
    process.exit(1);
  }

  try {
    const file = await exportMemory(cwd, workflow);
    console.log(chalk.green(`✅ Exported ${path.basename(file)}`));
    console.log(chalk.gray(`📁 ${file}`));
  } catch (error) {
    handleMemoryError(error, workflow);
  }
}
