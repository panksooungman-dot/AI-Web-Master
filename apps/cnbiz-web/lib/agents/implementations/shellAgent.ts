import { executeShellCommand } from "@/lib/terminal/server";
import type { Agent } from "../types";

export const shellAgent: Agent = {
  id: "shell",
  name: "Shell",
  description: "Workspace 경로에서 임의의 셸 명령을 실행합니다.",

  async isAvailable() {
    return true;
  },

  async run({ prompt, context, signal }) {
    const result = await executeShellCommand(prompt, context.cwd, { signal });

    return {
      success: result.success,
      output: result.output ?? "",
      error: result.error,
    };
  },
};
