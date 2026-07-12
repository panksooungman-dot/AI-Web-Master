import { loadAgent } from "../runtime/loader.js";
import { createRuntimeContext } from "../runtime/context.js";
import { executeAgent } from "../runtime/executor.js";
import { RuntimeError } from "../runtime/types.js";
import type { StepResult, WorkflowStepDefinition } from "./types.js";

const ACRONYMS = new Set(["ui", "ux", "ai", "qa", "api", "seo", "os", "ci", "cd"]);

export function stepLabel(step: WorkflowStepDefinition): string {
  return step.agent
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) =>
      ACRONYMS.has(part.toLowerCase())
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

/**
 * 워크플로의 한 단계를 실행한다.
 * - agents/<agent> 또는 marketplace/agents/<agent>에 실제 Agent Runtime 패키지가 있으면
 *   그대로 로드·실행한다(Agent Runtime의 loader/context/executor 재사용).
 * - 패키지가 아예 없으면(RuntimeError NOT_FOUND) 역할 이름만으로 시뮬레이션된 단계로
 *   성공 처리한다 — 모든 Agent를 미리 만들지 않고도 파이프라인을 스케치할 수 있게 한다.
 * - 패키지는 있지만 손상된 경우(파일 누락/메타데이터/버전 오류)는 실제 오류로 전파해
 *   워크플로가 해당 단계에서 멈추도록 한다(Stop on error).
 */
export async function executeStep(
  index: number,
  step: WorkflowStepDefinition,
  cwd: string,
  variables: Record<string, string>,
  providerId?: string,
  workflowName?: string,
  previousOutput?: unknown
): Promise<StepResult> {
  const startedAt = new Date().toISOString();

  try {
    const agent = await loadAgent(step.agent, cwd);
    const context = await createRuntimeContext({ agentName: agent.metadata.name, cwd, variables });
    const result = await executeAgent(agent, context, {
      providerId,
      workflow: workflowName,
      step: step.agent,
      input: previousOutput
    });
    const finishedAt = new Date().toISOString();

    return {
      index,
      agent: step.agent,
      status: result.success ? "success" : "failed",
      simulated: false,
      startedAt,
      finishedAt,
      durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
      output: result.output,
      error: result.error,
      provider: result.provider,
      model: result.model
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();

    if (error instanceof RuntimeError && error.code === "NOT_FOUND") {
      return {
        index,
        agent: step.agent,
        status: "success",
        simulated: true,
        startedAt,
        finishedAt,
        durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
        output: `[simulated] Agent "${step.agent}" is not installed — ran as a placeholder step.`
      };
    }

    return {
      index,
      agent: step.agent,
      status: "failed",
      simulated: false,
      startedAt,
      finishedAt,
      durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
      output: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
