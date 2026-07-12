export type ExecutionMode = "sequential" | "parallel" | "conditional";

export type OrchestratorErrorCode = "NOT_FOUND" | "INVALID_PLAN" | "DUPLICATE_RUNTIME";

export class OrchestratorError extends Error {
  code: OrchestratorErrorCode;

  constructor(code: OrchestratorErrorCode, message: string) {
    super(message);
    this.name = "OrchestratorError";
    this.code = code;
  }
}

/** planner.ts가 workflow.json의 한 step으로부터 만드는 실행 계획 노드 */
export interface PlanStep {
  index: number;
  agent: string;
  label: string;
  dependsOn: number[];
  /** 예약 필드 — Conditional(future-ready). 현재 MVP는 평가하지 않고 통과시킨다. */
  condition?: string;
}

/** 의존성이 모두 해소되어 함께 실행 가능한 step들의 배치 */
export interface ExecutionStage {
  stage: number;
  mode: ExecutionMode;
  steps: PlanStep[];
}

export interface ExecutionPlan {
  workflow: string;
  version: string;
  stages: ExecutionStage[];
}

export type StepRunState = "pending" | "running" | "completed" | "failed" | "stopped";

export interface StepStatusEntry {
  index: number;
  agent: string;
  label: string;
  state: StepRunState;
  simulated?: boolean;
  error?: string;
  provider?: string;
  model?: string;
}

export type OrchestratorRunState = "running" | "completed" | "failed" | "stopped";

/** .runtime/orchestrator/status.json */
export interface OrchestratorStatus {
  workflow: string;
  version: string;
  state: OrchestratorRunState;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  currentStage: number;
  totalStages: number;
  steps: StepStatusEntry[];
  pid: number;
}

/** .runtime/orchestrator/history.json 의 각 항목 */
export interface OrchestratorRunResult {
  workflow: string;
  version: string;
  success: boolean;
  stopped: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  steps: StepStatusEntry[];
}
