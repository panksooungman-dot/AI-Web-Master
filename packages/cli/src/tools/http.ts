import { ToolError, type Tool } from "./types.js";

export interface HttpInput {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpOutput {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const DEFAULT_TIMEOUT_MS = 15000;

function isHttpInput(input: unknown): input is HttpInput {
  return typeof input === "object" && input !== null && typeof (input as Record<string, unknown>).url === "string";
}

/** http/browser 도구가 함께 재사용하는 fetch + 타임아웃 헬퍼. */
export async function fetchWithTimeout(
  toolId: string,
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ToolError("TIMEOUT", toolId, `Request to ${url} timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const httpTool: Tool = {
  id: "http",
  name: "HTTP",
  description: 'Perform an HTTP request, e.g. { method: "GET", url: "https://example.com" }.',

  async execute(input: unknown): Promise<unknown> {
    if (!isHttpInput(input)) {
      throw new ToolError("INVALID_INPUT", "http", "Expected { url: string, method?: string, headers?, body? }");
    }

    try {
      const response = await fetchWithTimeout(
        "http",
        input.url,
        { method: input.method ?? "GET", headers: input.headers, body: input.body },
        input.timeoutMs
      );

      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const result: HttpOutput = { status: response.status, headers, body };
      return result;
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }
      throw new ToolError("EXECUTION_FAILED", "http", error instanceof Error ? error.message : String(error));
    }
  }
};
