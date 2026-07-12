export type StepStatus = "pending" | "running" | "completed" | "failed";

/** workflow.json steps[N].agent → memory.steps[<agent>] */
export interface StepMemory {
  status: StepStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface MemoryContext {
  project: string;
  cwd: string;
  variables: Record<string, string>;
  user: Record<string, unknown>;
  environment: Record<string, unknown>;
}

/** 요구사항 4 — Memory Model */
export interface MemoryRecord {
  workflow: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  context: MemoryContext;
  steps: Record<string, StepMemory>;
}

export type MemoryErrorCode = "NOT_FOUND" | "INVALID_MEMORY";

export class MemoryError extends Error {
  code: MemoryErrorCode;

  constructor(code: MemoryErrorCode, message: string) {
    super(message);
    this.name = "MemoryError";
    this.code = code;
  }
}
