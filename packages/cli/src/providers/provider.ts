import { ProviderError } from "./types.js";
import type { ChatRequest, ChatResponse, ChatStreamChunk, RetryOptions } from "./types.js";

/** 요구사항 — Provider Interface. 모든 벤더 구현체(openai/anthropic/gemini/ollama/openrouter)가 따른다. */
export interface AIProvider {
  id: string;
  name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  models(): Promise<string[]>;
  validate(): Promise<boolean>;
  /** 스트리밍을 지원하는 provider(openai/anthropic)만 구현한다. 나머지는 undefined. */
  chatStream?(request: ChatRequest): AsyncGenerator<ChatStreamChunk>;
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 재시도 가치가 있는 실패인지 판단한다 — 인증/입력 오류(4xx)는 재시도하지 않는다. */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ProviderError)) {
    return false;
  }
  if (error.code === "TIMEOUT") {
    return true;
  }
  if (error.code === "REQUEST_FAILED") {
    // status가 없으면 응답 자체를 못 받은 네트워크 레벨 실패 — 일시적일 가능성이 높다.
    return error.status === undefined || error.status === 429 || error.status >= 500;
  }
  return false;
}

/** 지수 백오프로 fn()을 재시도한다. 마지막 시도의 에러를 그대로 던진다. */
async function withRetry<T>(retry: RetryOptions, fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 1 + (retry.retries ?? DEFAULT_RETRIES);
  const baseDelay = retry.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw error;
      }
      await sleep(baseDelay * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

async function fetchJsonOnce(providerId: string, url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();

    if (!response.ok) {
      throw new ProviderError(
        "REQUEST_FAILED",
        providerId,
        `${providerId} request failed (${response.status}): ${text.slice(0, 500)}`,
        response.status
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

/**
 * 모든 provider 구현체가 공유하는 fetch 헬퍼 — 타임아웃·재시도(지수 백오프)·실패 응답·JSON 파싱
 * 오류 처리를 한 곳에서 통일한다. provider별 URL/헤더/바디 구성만 각 vendor 파일이 담당한다.
 * 429/5xx/네트워크 오류/타임아웃만 재시도하고, 401/403/400 등 4xx는 즉시 던진다.
 */
export async function providerFetchJson(
  providerId: string,
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  retry: RetryOptions = {}
): Promise<unknown> {
  return withRetry(retry, () => fetchJsonOnce(providerId, url, init, timeoutMs));
}

async function connectSseOnce(providerId: string, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ProviderError(
        "REQUEST_FAILED",
        providerId,
        `${providerId} stream request failed (${response.status}): ${text.slice(0, 500)}`,
        response.status
      );
    }

    if (!response.body) {
      throw new ProviderError("INVALID_RESPONSE", providerId, `${providerId} did not return a streaming response body.`);
    }

    return response;
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderError("TIMEOUT", providerId, `${providerId} stream request timed out after ${timeoutMs}ms.`);
    }
    throw new ProviderError(
      "REQUEST_FAILED",
      providerId,
      `${providerId} stream request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timer);
  }
}

export interface SseEvent {
  event?: string;
  data: string;
}

/**
 * SSE(text/event-stream) 응답을 라인 단위 이벤트로 파싱해 순차적으로 yield한다.
 * 연결 수립(fetch + 상태 코드 확인)까지만 재시도 대상이다 — 청크가 이미 도착하기 시작한
 * 이후의 스트림 중단은 부분 응답을 감추지 않기 위해 재시도하지 않고 그대로 던진다.
 * OpenAI/Anthropic의 스트리밍 chat()이 이 helper를 공유한다.
 */
export async function* providerFetchSseStream(
  providerId: string,
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  retry: RetryOptions = {}
): AsyncGenerator<SseEvent> {
  const response = await withRetry(retry, () => connectSseOnce(providerId, url, init, timeoutMs));
  const body = response.body;

  if (!body) {
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        let event: string | undefined;
        const dataLines: string[] = [];

        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("event:")) {
            event = line.slice("event:".length).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trim());
          }
        }

        if (dataLines.length > 0) {
          yield { event, data: dataLines.join("\n") };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
