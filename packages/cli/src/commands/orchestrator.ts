import { Command } from "commander";
import chalk from "chalk";
import { runOrchestrator } from "../orchestrator/runtime.js";
import { isLocked, readStatus, requestStop } from "../orchestrator/manager.js";
import { OrchestratorError } from "../orchestrator/types.js";
import { ProviderError } from "../providers/types.js";

async function orchestratorRunCommand(name: string, options: { provider?: string } = {}): Promise<void> {
  if (!name) {
    console.log(chalk.red("❌ Workflow name is required."));
    console.log(chalk.yellow("Usage: ai orchestrator run <workflow>"));
    process.exit(1);
  }

  try {
    const result = await runOrchestrator(name, { providerId: options.provider });
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof OrchestratorError) {
      console.log(chalk.red(`❌ ${error.message}`));
    } else if (error instanceof ProviderError) {
      console.log(chalk.red(`❌ [${error.provider}] ${error.message}`));
    } else {
      console.log(chalk.red(`❌ Failed to run orchestrator for "${name}".`));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
    process.exit(1);
  }
}

function printStepList(names: string[]): void {
  if (names.length === 0) {
    console.log("(none)");
    return;
  }
  names.forEach((name) => console.log(name));
}

async function orchestratorStatusCommand(): Promise<void> {
  const status = await readStatus(process.cwd());

  if (!status) {
    console.log(chalk.yellow("⚠️ No orchestrator run found. Run `ai orchestrator run <workflow>` first."));
    return;
  }

  const running = status.steps.filter((step) => step.state === "running").map((step) => step.label);
  const completed = status.steps.filter((step) => step.state === "completed").map((step) => step.label);
  const remaining = status.steps.filter((step) => step.state === "pending").map((step) => step.label);

  console.log(`Workflow: ${status.workflow}`);
  console.log();
  console.log("Running step:");
  console.log();
  printStepList(running);
  console.log();
  console.log("Completed:");
  console.log();
  printStepList(completed);
  console.log();
  console.log("Remaining:");
  console.log();
  printStepList(remaining);
}

async function orchestratorStopCommand(): Promise<void> {
  const cwd = process.cwd();
  const status = await readStatus(cwd);

  if (!status || status.state !== "running") {
    console.log(chalk.yellow("⚠️ No orchestrator run is currently active."));
    return;
  }

  if (!(await isLocked(cwd, status.workflow))) {
    console.log(chalk.yellow(`⚠️ No active orchestrator process found for "${status.workflow}" (stale status).`));
    return;
  }

  await requestStop(cwd, status.workflow);
  console.log(
    chalk.green(`✅ Stop requested for "${status.workflow}". It will stop gracefully after the current stage.`)
  );
}

/** `ai orchestrator <run|status|stop>` 명령을 구성한다. */
export function buildOrchestratorCommand(): Command {
  const orchestrator = new Command("orchestrator").description(
    "Workflow 실행 오케스트레이션 (실행 계획 수립·의존성 기반 병렬 실행·상태 관리)"
  );

  orchestrator
    .command("run")
    .argument("<workflow>", "Workflow name")
    .option("--provider <id>", "LLM provider (anthropic|openai|gemini|ollama). 생략 시 기본 provider 또는 시뮬레이션")
    .description("실행 계획을 수립해 Workflow를 오케스트레이션 실행")
    .action(async (name: string, options: { provider?: string }) => {
      await orchestratorRunCommand(name, options);
    });

  orchestrator
    .command("status")
    .description("현재/마지막 오케스트레이터 실행 상태 출력")
    .action(async () => {
      await orchestratorStatusCommand();
    });

  orchestrator
    .command("stop")
    .description("실행 중인 오케스트레이터를 정상적으로 중단(상태 저장, 향후 재개 대비)")
    .action(async () => {
      await orchestratorStopCommand();
    });

  return orchestrator;
}
