/**
 * 요구사항 — Tool Interface: `{ id: string; execute(input): Promise<any> }`.
 * name/description은 `ai tools list`에 표시하기 위한 확장 필드다.
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  execute(input: unknown): Promise<unknown>;
}

export type ToolErrorCode = "NOT_FOUND" | "INVALID_INPUT" | "EXECUTION_FAILED" | "FORBIDDEN_PATH" | "TIMEOUT";

export class ToolError extends Error {
  code: ToolErrorCode;
  tool: string;

  constructor(code: ToolErrorCode, tool: string, message: string) {
    super(message);
    this.name = "ToolError";
    this.code = code;
    this.tool = tool;
  }
}
