export interface StartDevServerResponse {
  success: boolean;
  pid?: number;
  error?: string;
}

export async function startDevServer(cwd: string): Promise<StartDevServerResponse> {
  try {
    const res = await fetch("/api/devserver/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cwd }),
    });

    return (await res.json()) as StartDevServerResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return { success: false, error: message };
  }
}

export interface StopDevServerResponse {
  success: boolean;
  error?: string;
}

export async function stopDevServer(cwd: string): Promise<StopDevServerResponse> {
  try {
    const res = await fetch("/api/devserver/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cwd }),
    });

    return (await res.json()) as StopDevServerResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return { success: false, error: message };
  }
}

export async function restartDevServer(cwd: string): Promise<StartDevServerResponse> {
  try {
    const res = await fetch("/api/devserver/restart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cwd }),
    });

    return (await res.json()) as StartDevServerResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return { success: false, error: message };
  }
}

export type DevServerRunStatus = "starting" | "running" | "stopped" | "error";

export interface DevServerStatusResponse {
  running: boolean;
  status: DevServerRunStatus;
  pid: number | null;
  port: number | null;
  error?: string;
}

export async function fetchDevServerStatus(cwd: string): Promise<DevServerStatusResponse> {
  try {
    const res = await fetch(`/api/devserver/status?cwd=${encodeURIComponent(cwd)}`);
    return (await res.json()) as DevServerStatusResponse;
  } catch {
    return { running: false, status: "stopped", pid: null, port: null };
  }
}
