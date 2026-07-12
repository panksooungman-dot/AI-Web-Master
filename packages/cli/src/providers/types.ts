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

  constructor(code: ProviderErrorCode, provider: string, message: string) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.provider = provider;
  }
}
