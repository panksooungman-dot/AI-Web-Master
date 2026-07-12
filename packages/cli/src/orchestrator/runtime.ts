import chalk from "chalk";
import { loadWorkflow } from "../workflow/loader.js";
import { getOrCreateMemory } from "../memory/manager.js";
import { createExecutionPlan } from "./planner.js";
import { runPlan } from "./scheduler.js";
import { acquireLock, appendHistory, clearStopFlag, releaseLock } from "./manager.js";
import type { OrchestratorRunResult } from "./types.js";

export interface RunOrchestratorOptions {
  cwd?: string;
  variables?: Record<string, string>;
  providerId?: string;
}

/**
 * `ai orchestrator run <workflow>` 진입점.
 * Workflow Runtime(loader)·Memory Manager·Planner·Scheduler를 조합만 할 뿐,
 * 개별 step/agent 실행 로직은 재구현하지 않는다(요구사항 9: 재사용, 중복 없음).
 */
export async function runOrchestrator(
  name: string,
  options: RunOrchestratorOptions = {}
): Promise<OrchestratorRunResult> {
  const { cwd = process.cwd(), variables = {}, providerId } = options;

  await acquireLock(cwd, name);
  await clearStopFlag(cwd, name);

  const startedAt = new Date().toISOString();

  try {
    console.log(chalk.cyan("Loading workflow..."));
    const workflow = await loadWorkflow(name, cwd);

    console.log(chalk.cyan("Creating execution plan..."));
    const plan = createExecutionPlan(workflow);

    // 요구사항 3 — Read Memory (없으면 생성, Memory Manager 재사용)
    await getOrCreateMemory(cwd, workflow.name, { version: workflow.version, context: { variables } });

    const { steps, failed, stopped } = await runPlan(plan, { cwd, variables, startedAt, providerId });

    const finishedAt = new Date().toISOString();

    if (stopped) {
      console.log(chalk.yellow("⏸ Orchestrator stopped gracefully. State saved for future resume."));
    } else if (!failed) {
      console.log(chalk.green("Orchestrator run complete."));
    }

    const result: OrchestratorRunResult = {
      workflow: workflow.name,
      version: workflow.version,
      success: !failed && !stopped,
      stopped,
      startedAt,
      finishedAt,
      durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
      steps
    };

    await appendHistory(cwd, result);
    return result;
  } finally {
    await releaseLock(cwd, name);
  }
}
