import { ToolError, type Tool } from "./types.js";
import { fetchWithTimeout } from "./http.js";

export interface BrowserInput {
  url: string;
  timeoutMs?: number;
}

export interface BrowserOutput {
  status: number;
  title: string;
  contentLength: number;
  snippet: string;
}

function isBrowserInput(input: unknown): input is BrowserInput {
  return typeof input === "object" && input !== null && typeof (input as Record<string, unknown>).url === "string";
}

/**
 * 경량 "브라우저" 도구 — 실제 JS 렌더링 브라우저(Playwright 등)를 CLI 의존성으로
 * 추가하지 않고, HTTP로 페이지를 가져와 제목/본문 스니펫을 추출한다. 전체 브라우저
 * 자동화가 필요하면 Playwright MCP를 사용한다.
 */
export const browserTool: Tool = {
  id: "browser",
  name: "Browser (lightweight)",
  description: "Fetch a URL over HTTP and extract its title and a text snippet (no JS rendering).",

  async execute(input: unknown): Promise<unknown> {
    if (!isBrowserInput(input)) {
      throw new ToolError("INVALID_INPUT", "browser", "Expected { url: string }");
    }

    try {
      const response = await fetchWithTimeout("browser", input.url, {}, input.timeoutMs);
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const result: BrowserOutput = {
        status: response.status,
        title: titleMatch ? titleMatch[1].trim() : "",
        contentLength: html.length,
        snippet: text.slice(0, 1000)
      };

      return result;
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }
      throw new ToolError("EXECUTION_FAILED", "browser", error instanceof Error ? error.message : String(error));
    }
  }
};
