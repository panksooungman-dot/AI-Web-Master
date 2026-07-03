import { executeShellCommand } from "@/lib/terminal/server";
import type { Agent } from "../types";

function escapeForShell(value: string): string {
  return value.replace(/"/g, '`"');
}

export const claudeCodeAgent: Agent = {
  id: "claude-code",
  name: "Claude Code",
  description: "Claude Code CLI를 통해 프롬프트를 headless로 실행합니다.",

  async isAvailable() {
    const result = await executeShellCommand("claude --version", process.cwd());
    return result.success;
  },

  async run({ prompt, context, signal }) {
    const escaped = escapeForShell(prompt);
    const result = await executeShellCommand(`claude -p "${escaped}"`, context.cwd, {
      signal,
    });

    return {
      success: result.success,
      output: result.output ?? "",
      error: result.error,
    };
  },
};
