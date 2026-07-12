import { executeStep } from "../workflow/executor.js";
import { updateStep as updateMemoryStep } from "../memory/manager.js";
import type { ExecutionStage, StepStatusEntry } from "./types.js";

/**
 * 한 stage(의존성이 모두 해소된 step들의 배치)를 실행한다.
 * step이 2개 이상이면 Promise.all로 병렬 실행하고(Parallel 모드), 1개면 그대로 실행한다.
 * 개별 step 실행은 Workflow Runtime의 executeStep()을 그대로 재사용한다 — Agent Runtime까지
 * 이어지는 기존 실행 경로(loader→context→executeAgent, 시뮬레이션 폴백 포함)를
 * 중복 구현하지 않는다(요구사항 9).
 */
export async function executeStage(
  stage: ExecutionStage,
  cwd: string,
  workflowName: string,
  variables: Record<string, string>,
  providerId?: string,
  previousStageOutput?: unknown
): Promise<StepStatusEntry[]> {
  const results = await Promise.all(
    stage.steps.map((step) =>
      executeStep(step.index, { agent: step.agent }, cwd, variables, providerId, workflowName, previousStageOutput)
    )
  );

  const entries: StepStatusEntry[] = [];

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const planStep = stage.steps[i];

    // 요구사항 3 — 단계 실행 후 Memory 갱신(Memory Manager 재사용)
    await updateMemoryStep(cwd, workflowName, result.agent, {
      status: result.status === "success" ? "completed" : "failed",
      input: {},
      output: { message: result.output, simulated: result.simulated },
      error: result.error
    });

    entries.push({
      index: result.index,
      agent: result.agent,
      label: planStep.label,
      state: result.status === "success" ? "completed" : "failed",
      simulated: result.simulated,
      error: result.error,
      provider: result.provider,
      model: result.model
    });
  }

  return entries;
}
