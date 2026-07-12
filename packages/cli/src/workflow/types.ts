export type WorkflowErrorCode =
  | "NOT_FOUND"
  | "MISSING_FILE"
  | "INVALID_METADATA"
  | "INVALID_VERSION"
  | "INVALID_STEP"
  | "DUPLICATE_RUNTIME"
  | "NOT_IMPLEMENTED";

export class WorkflowError extends Error {
  code: WorkflowErrorCode;

  constructor(code: WorkflowErrorCode, message: string) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
  }
}

/** workflow.json의 각 단계 — 최소 `agent`만 필수, 이후 확장 여지를 위해 나머지 필드는 허용 */
export interface WorkflowStepDefinition {
  agent: string;
  [key: string]: unknown;
}

/** loader.ts가 로드·검증한 workflow.json */
export interface WorkflowDefinition {
  name: string;
  version: string;
  steps: WorkflowStepDefinition[];
  dir: string;
}

export type StepStatus = "success" | "failed";

export interface StepResult {
  index: number;
  agent: string;
  status: StepStatus;
  /** 실제 Agent Runtime 패키지 없이 역할 이름만으로 시뮬레이션했는지 여부 */
  simulated: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  output: string;
  error?: string;
  /** 실제 LLM Provider로 실행된 경우에만 채워진다 */
  provider?: string;
  model?: string;
}

export interface WorkflowRunResult {
  workflow: string;
  version: string;
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  steps: StepResult[];
}
