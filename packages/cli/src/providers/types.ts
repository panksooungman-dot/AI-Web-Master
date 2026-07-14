export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  provider: string;
  model: string;
  content: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

/** ai chat --stream / provider.chatStream()이 공통으로 사용하는 표준화된 스트리밍 청크. */
export interface ChatStreamChunk {
  /** 이번 청크에서 새로 도착한 텍스트 조각(누적 아님). */
  delta: string;
  /** 스트림의 마지막 청크인지 여부. true인 경우 usage/model이 함께 채워질 수 있다. */
  done: boolean;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

/** providerFetchJson()/providerFetchSseStream() 공용 재시도 옵션. */
export interface RetryOptions {
  /** 최초 시도 이후 추가로 재시도할 횟수 (기본 2 — 총 3회 시도). */
  retries?: number;
  /** 지수 백오프 기준 지연(ms), 시도마다 2^n으로 증가 (기본 300ms). */
  baseDelayMs?: number;
}

/** providers.json의 각 provider 항목 (env 변수 치환이 이미 끝난 상태) */
export type ProviderConfig = Record<string, string>;

/** .runtime/config/providers.json */
export interface ProvidersFile {
  default?: string;
  providers: Record<string, Record<string, string>>;
}

export type ProviderErrorCode =
  | "NOT_FOUND"
  | "MISSING_API_KEY"
  | "REQUEST_FAILED"
  | "INVALID_RESPONSE"
  | "TIMEOUT";

export class ProviderError extends Error {
  code: ProviderErrorCode;
  provider: string;
  /** REQUEST_FAILED일 때 실제 HTTP status. 네트워크 레벨 실패(응답 자체를 못 받음)면 undefined. */
  status?: number;

  constructor(code: ProviderErrorCode, provider: string, message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.provider = provider;
    this.status = status;
  }
}
