import type { Shell } from "@/lib/settings/store";

export interface TerminalApiResponse {
  success: boolean;
  output?: string;
  error?: string;
  cwd?: string;
}

export interface RunCommandOptions {
  cwd?: string | null;
  shell?: Shell;
}

export async function runTerminalCommand(
  command: string,
  options: RunCommandOptions = {}
): Promise<TerminalApiResponse> {
  try {
    const res = await fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, cwd: options.cwd, shell: options.shell }),
    });

    return (await res.json()) as TerminalApiResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return { success: false, error: message };
  }
}

export async function fetchDefaultCwd(): Promise<string | null> {
  try {
    const res = await fetch("/api/terminal");
    const data = (await res.json()) as { cwd: string };
    return data.cwd;
  } catch {
    return null;
  }
}
