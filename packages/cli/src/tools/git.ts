import { ToolError, type Tool } from "./types.js";
import { terminalTool } from "./terminal.js";

export interface GitInput {
  args: string[];
  cwd?: string;
}

function isGitInput(input: unknown): input is GitInput {
  return (
    typeof input === "object" &&
    input !== null &&
    Array.isArray((input as Record<string, unknown>).args) &&
    ((input as Record<string, unknown>).args as unknown[]).every((arg) => typeof arg === "string")
  );
}

/** git 명령 실행 — Terminal 도구를 재사용해 별도 프로세스 실행 로직을 중복하지 않는다. */
export const gitTool: Tool = {
  id: "git",
  name: "Git",
  description: 'Run a git command, e.g. { args: ["status", "--porcelain"] }.',

  async execute(input: unknown): Promise<unknown> {
    if (!isGitInput(input)) {
      throw new ToolError("INVALID_INPUT", "git", "Expected { args: string[], cwd?: string }");
    }

    const command = ["git", ...input.args.map((arg) => (arg.includes(" ") ? `"${arg}"` : arg))].join(" ");

    return terminalTool.execute({ command, cwd: input.cwd });
  }
};
