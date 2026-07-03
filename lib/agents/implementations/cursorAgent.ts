import { executeShellCommand } from "@/lib/terminal/server";
import type { Agent } from "../types";

export const cursorAgent: Agent = {
  id: "cursor",
  name: "Cursor",
  description: "Cursor 에디터에서 Workspace 폴더를 엽니다.",

  async isAvailable() {
    const result = await executeShellCommand("cursor --version", process.cwd());
    return result.success;
  },

  async run({ context, signal }) {
    const result = await executeShellCommand(`cursor "${context.cwd}"`, context.cwd, {
      signal,
    });

    return {
      success: result.success,
      output: result.output || "Cursor에서 Workspace를 열었습니다.",
      error: result.error,
    };
  },
};
