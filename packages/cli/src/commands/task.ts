import { Command } from "commander";
import chalk from "chalk";
import { getProviderManager } from "../providers/manager.js";
import { getTask, listTasks, recordTask, type TaskLedgerEntry } from "../tasks/ledger.js";

function printEntry(entry: TaskLedgerEntry): void {
  const statusIcon = entry.status === "success" ? "✅" : "❌";
  const simulatedTag = entry.simulated ? " [simulated]" : "";
  console.log(`${statusIcon} ${entry.id}  ${entry.kind}  ${entry.providerId ?? "-"}${simulatedTag}  ${entry.createdAt}`);
  console.log(chalk.gray(`   ${entry.userPrompt.slice(0, 80)}`));
}

/** `ai task list [--json]` */
async function taskListCommand(options: { json?: boolean }): Promise<void> {
  const entries = await listTasks(process.cwd());

  if (options.json) {
    console.log(JSON.stringify({ success: true, tasks: entries }));
    return;
  }

  if (entries.length === 0) {
    console.log(chalk.yellow("⚠️ No tasks recorded yet. Run `ai chat` or `ai prompt execute` first."));
    return;
  }

  console.log(chalk.cyan("\n🗂  AI Task History"));
  console.log(chalk.gray("--------------------------------"));
  entries.forEach(printEntry);
}

/** `ai task show <id> [--json]` */
async function taskShowCommand(id: string, options: { json?: boolean }): Promise<void> {
  const entry = await getTask(process.cwd(), id);

  if (!entry) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: `Task "${id}" was not found.` }));
      process.exit(1);
    }
    console.log(chalk.red(`❌ Task "${id}" was not found.`));
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify({ success: true, task: entry }));
    return;
  }

  printEntry(entry);
  console.log(chalk.gray(`\nSystem: ${entry.systemPrompt}`));
  if (entry.result) {
    console.log(`\n${entry.result}`);
  }
  if (entry.error) {
    console.log(chalk.red(`\n${entry.error}`));
  }
}

/**
 * `ai task retry <id> [--json]` — 기록된 provider/prompt로 ProviderManager.complete()를
 * 다시 호출한다(새 실행 로직 없음). CLI 호출은 동기적이라 "취소"는 존재하지 않고,
 * "재시도"는 새 원장 항목을 만드는 것으로 처리한다.
 */
async function taskRetryCommand(id: string, options: { json?: boolean }): Promise<void> {
  const cwd = process.cwd();
  const entry = await getTask(cwd, id);

  if (!entry) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: `Task "${id}" was not found.` }));
      process.exit(1);
    }
    console.log(chalk.red(`❌ Task "${id}" was not found.`));
    process.exit(1);
  }

  try {
    const manager = getProviderManager(cwd);
    const completion = await manager.complete({
      providerId: entry.providerId,
      systemPrompt: entry.systemPrompt,
      userPrompt: entry.userPrompt,
      fallbackLabel: `Retry of ${entry.id}`
    });

    const retried = await recordTask(cwd, {
      kind: entry.kind,
      providerId: completion.provider ?? entry.providerId,
      systemPrompt: entry.systemPrompt,
      userPrompt: entry.userPrompt,
      status: "success",
      simulated: completion.simulated,
      result: completion.text
    });

    if (options.json) {
      console.log(JSON.stringify({ success: true, task: retried }));
      return;
    }

    console.log(chalk.green(`✅ Retried as new task "${retried.id}".`));
    printEntry(retried);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    const retried = await recordTask(cwd, {
      kind: entry.kind,
      providerId: entry.providerId,
      systemPrompt: entry.systemPrompt,
      userPrompt: entry.userPrompt,
      status: "failed",
      simulated: false,
      error: message
    });

    if (options.json) {
      console.log(JSON.stringify({ success: false, task: retried, error: message }));
      process.exit(1);
    }

    console.log(chalk.red(`❌ Retry failed: ${message}`));
    process.exit(1);
  }
}

/** `ai task <list|show|retry>` 명령을 구성한다. */
export function buildTaskCommand(): Command {
  const task = new Command("task").description("CLI를 통해 실행된 AI 호출 기록 관리 (list/show/retry)");

  task
    .command("list")
    .option("--json", "JSON 형식으로 출력")
    .description("기록된 task 목록 조회")
    .action(async (options: { json?: boolean }) => {
      await taskListCommand(options);
    });

  task
    .command("show")
    .argument("<id>", "Task id")
    .option("--json", "JSON 형식으로 출력")
    .description("task 상세 조회")
    .action(async (id: string, options: { json?: boolean }) => {
      await taskShowCommand(id, options);
    });

  task
    .command("retry")
    .argument("<id>", "Task id")
    .option("--json", "JSON 형식으로 출력")
    .description("기록된 provider/prompt로 재실행")
    .action(async (id: string, options: { json?: boolean }) => {
      await taskRetryCommand(id, options);
    });

  return task;
}
