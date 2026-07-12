/** 요구사항 — 지원 변수: {{project}} {{workflow}} {{memory}} {{step}} {{input}} {{output}} */
export interface PromptVariables {
  agent?: string;
  project?: string;
  workflow?: string;
  memory?: unknown;
  step?: string;
  input?: unknown;
  output?: unknown;
  [key: string]: unknown;
}

/** prompt.json */
export interface PromptMetadata {
  version: string;
  author: string;
}

/** loader.ts가 읽은 원본(미렌더링) 프롬프트 파일들 */
export interface PromptSet {
  system: string;
  user: string;
  examples: string;
  metadata: PromptMetadata;
}

export interface RenderedPrompt {
  system: string;
  user: string;
  examples: string;
  /** system + examples + user 를 하나로 합친 최종 프롬프트 */
  combined: string;
  metadata: PromptMetadata;
}

export type PromptErrorCode = "MISSING_FILE" | "INVALID_METADATA" | "INVALID_VERSION";

export class PromptError extends Error {
  code: PromptErrorCode;

  constructor(code: PromptErrorCode, message: string) {
    super(message);
    this.name = "PromptError";
    this.code = code;
  }
}
