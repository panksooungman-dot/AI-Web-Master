import type { Tool } from "../tools/types.js";

export type RuntimeErrorCode =
  | "NOT_FOUND"
  | "MISSING_FILE"
  | "INVALID_METADATA"
  | "INVALID_VERSION"
  | "DUPLICATE_RUNTIME";

export class RuntimeError extends Error {
  code: RuntimeErrorCode;

  constructor(code: RuntimeErrorCode, message: string) {
    super(message);
    this.name = "RuntimeError";
    this.code = code;
  }
}

/** agents/<name>/agent.json 의 검증된 메타데이터 */
export interface AgentMetadata {
  name: string;
  type: "agent";
  version: string;
  description: string;
  author: string;
  createdAt: string;
  /** Tool System 요구사항 6 — 이 Agent가 사용할 수 있는 tool id 목록 */
  tools: string[];
}

/** loader.ts가 로드한 Agent 전체(메타데이터 + 프롬프트 + 실행 설정 + 로드된 Tool 인스턴스) */
export interface AgentDefinition {
  name: string;
  dir: string;
  metadata: AgentMetadata;
  prompt: string;
  config: Record<string, unknown>;
  tools: Tool[];
}

/** 요구사항 5 — Runtime Context */
export interface RuntimeContext {
  project: string;
  cwd: string;
  timestamp: string;
  variables: Record<string, string>;
  memory: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  agent: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  output: string;
  error?: string;
  /** 실제 LLM Provider로 실행된 경우에만 채워진다(시뮬레이션인 경우 undefined) */
  provider?: string;
  model?: string;
}
