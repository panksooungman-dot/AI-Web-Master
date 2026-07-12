import { stepLabel } from "../workflow/executor.js";
import type { WorkflowDefinition, WorkflowStepDefinition } from "../workflow/types.js";
import { OrchestratorError, type ExecutionPlan, type ExecutionStage, type PlanStep } from "./types.js";

function resolveDependsOn(
  step: WorkflowStepDefinition,
  index: number,
  agentToIndex: Map<string, number>
): number[] {
  const explicit = step.dependsOn;

  if (Array.isArray(explicit)) {
    return explicit
      .filter((dep): dep is string => typeof dep === "string")
      .map((dep) => {
        const depIndex = agentToIndex.get(dep);
        if (depIndex === undefined) {
          throw new OrchestratorError(
            "INVALID_PLAN",
            `Step[${index}] ("${step.agent}") depends on unknown agent "${dep}".`
          );
        }
        return depIndex;
      });
  }

  if (step.parallel === true) {
    return [];
  }

  // 기본값: 이전 단계에 순차 의존 — 명시적 dependsOn/parallel이 없는 기존 workflow.json과
  // 100% 호환되는 Sequential 동작을 보장한다.
  return index === 0 ? [] : [index - 1];
}

/**
 * workflow.json의 steps로부터 의존성 그래프를 만들고, 위상 정렬로 stage(동시 실행 가능한
 * step들의 배치)로 묶는다. 한 stage에 step이 2개 이상이면 Parallel, 1개면 Sequential로
 * 표시한다. step에 `condition` 필드가 있으면 Conditional(future-ready)로 표시하되
 * 이번 MVP에서는 조건을 평가하지 않고 그대로 실행한다.
 */
export function createExecutionPlan(workflow: WorkflowDefinition): ExecutionPlan {
  const agentToIndex = new Map(workflow.steps.map((step, index) => [step.agent, index]));

  const planSteps: PlanStep[] = workflow.steps.map((step, index) => ({
    index,
    agent: step.agent,
    label: stepLabel(step),
    dependsOn: resolveDependsOn(step, index, agentToIndex),
    condition: typeof step.condition === "string" ? step.condition : undefined
  }));

  const resolved = new Set<number>();
  const stages: ExecutionStage[] = [];
  let remaining = [...planSteps];
  let stageNumber = 0;

  while (remaining.length > 0) {
    const ready = remaining.filter((step) => step.dependsOn.every((dep) => resolved.has(dep)));

    if (ready.length === 0) {
      throw new OrchestratorError(
        "INVALID_PLAN",
        `Could not resolve execution plan for workflow "${workflow.name}" — circular or unresolved dependency detected.`
      );
    }

    stages.push({
      stage: stageNumber,
      mode: ready.some((step) => step.condition) ? "conditional" : ready.length > 1 ? "parallel" : "sequential",
      steps: ready
    });

    ready.forEach((step) => resolved.add(step.index));
    remaining = remaining.filter((step) => !resolved.has(step.index));
    stageNumber += 1;
  }

  return { workflow: workflow.name, version: workflow.version, stages };
}
