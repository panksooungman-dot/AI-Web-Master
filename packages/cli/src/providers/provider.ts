import { ProviderError } from "./types.js";
import type { ChatRequest, ChatResponse } from "./types.js";

/** 요구사항 — Provider Interface. 모든 벤더 구현체(openai/anthropic/gemini/ollama)가 따른다. */
export interface AIProvider {
  id: string;
  name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  models(): Promise<string[]>;
  validate(): Promise<boolean>;
}

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * 모든 provider 구현체가 공유하는 fetch 헬퍼 — 타임아웃, 실패 응답, JSON 파싱 오류 처리를
 * 한 곳에서 통일한다. provider별 URL/헤더/바디 구성만 각 vendor 파일이 담당한다.
 */
export async function providerFetchJson(
  providerId: string,
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();

    if (!response.ok) {
      throw new ProviderError(
        "REQUEST_FAILED",
        providerId,
        `${providerId} request failed (${response.status}): ${text.slice(0, 500)}`
      );
    }

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new ProviderError("INVALID_RESPONSE", providerId, `${providerId} returned a non-JSON response.`);
    }
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderError("TIMEOUT", providerId, `${providerId} request timed out after ${timeoutMs}ms.`);
    }
    throw new ProviderError(
      "REQUEST_FAILED",
      providerId,
      `${providerId} request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timer);
  }
}
