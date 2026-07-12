import chalk from "chalk";
import { loadMemory } from "../memory/manager.js";
import { executeStage } from "./executor.js";
import { isStopRequested, writeStatus } from "./manager.js";
import type { ExecutionPlan, OrchestratorRunState, StepStatusEntry } from "./types.js";

export interface ScheduleResult {
  steps: StepStatusEntry[];
  failed: boolean;
  stopped: boolean;
}

export interface RunPlanOptions {
  cwd: string;
  variables: Record<string, string>;
  startedAt: string;
  providerId?: string;
}

/**
 * ExecutionPlan의 stage들을 순서대로 실행한다.
 * - 매 stage 시작 전 stop 요청 여부를 확인한다(Graceful Stop) — 요청이 있으면 남은
 *   stage를 실행하지 않고 즉시 멈추고 현재까지의 상태를 저장한다(future resume 대비).
 * - 매 stage 전 Memory Manager로 memory를 로드한다(요구사항 3).
 * - stage 진행 상황을 매번 status.json에 실시간으로 기록한다.
 * - 한 step이 실패하면 이후 stage를 실행하지 않는다(Stop on error, Workflow Runtime과 동일 정책).
 */
export async function runPlan(plan: ExecutionPlan, options: RunPlanOptions): Promise<ScheduleResult> {
  const { cwd, variables, startedAt, providerId } = options;

  const steps: StepStatusEntry[] = plan.stages
    .flatMap((stage) => stage.steps)
    .sort((a, b) => a.index - b.index)
    .map((step) => ({ index: step.index, agent: step.agent, label: step.label, state: "pending" }));

  const persist = async (state: OrchestratorRunState, currentStage: number, finishedAt?: string) => {
    await writeStatus(cwd, {
      workflow: plan.workflow,
      version: plan.version,
      state,
      startedAt,
      updatedAt: new Date().toISOString(),
      finishedAt,
      currentStage,
      totalStages: plan.stages.length,
      steps,
      pid: process.pid
    });
  };

  await persist("running", 0);

  let failed = false;
  let stopped = false;
  // Prompt Engine {{input}}/{{output}} 체이닝 — 이전 stage의 결과가 다음 stage의 input이 된다.
  let previousStageOutput: unknown;

  for (const stage of plan.stages) {
    if (await isStopRequested(cwd, plan.workflow)) {
      stopped = true;
      break;
    }

    // 요구사항 3 — 단계 실행 전 memory 로드
    await loadMemory(cwd, plan.workflow);

    stage.steps.forEach((planStep) => {
      const entry = steps.find((s) => s.index === planStep.index);
      if (entry) {
        entry.state = "running";
      }
    });
    await persist("running", stage.stage);

    const label =
      stage.mode === "parallel"
        ? `Running ${stage.steps.map((s) => s.label).join(" + ")} (parallel)...`
        : stage.mode === "conditional"
          ? `Running ${stage.steps[0]?.label} (conditional — evaluation not yet implemented)...`
          : `Running ${stage.steps[0]?.label}...`;
    console.log(chalk.cyan(label));

    const stageResults = await executeStage(stage, cwd, plan.workflow, variables, providerId, previousStageOutput);
    previousStageOutput = stageResults.map((result) => ({
      agent: result.agent,
      simulated: result.simulated,
      error: result.error
    }));

    for (const result of stageResults) {
      const entry = steps.find((s) => s.index === result.index);
      if (entry) {
        entry.state = result.state;
        entry.simulated = result.simulated;
        entry.error = result.error;
      }
      if (result.state === "failed") {
        failed = true;
      }
    }

    await persist(failed ? "failed" : "running", stage.stage + 1);

    if (failed) {
      console.log(chalk.red("❌ A step failed — stopping (Stop on error)."));
      break;
    }
  }

  if (stopped) {
    steps.forEach((entry) => {
      if (entry.state === "pending" || entry.state === "running") {
        entry.state = "stopped";
      }
    });
  }

  const finalState: OrchestratorRunState = failed ? "failed" : stopped ? "stopped" : "completed";
  await persist(finalState, plan.stages.length, new Date().toISOString());

  return { steps, failed, stopped };
}
