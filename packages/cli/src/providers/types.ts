export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /**
   * 이 호출 하나에만 적용할 타임아웃(ms)/재시도 횟수 override — 기본값(provider.ts의
   * DEFAULT_TIMEOUT_MS=120000, DEFAULT_RETRIES=2, 즉 최악의 경우 3회 × 120초 ≈ 360초)은
   * 일반 대화형 호출에는 맞지만, Vercel 서버리스 함수의 실행 시간 제한(예: maxDuration=300)
   * 안에서 큰 JSON을 생성하는 호출(Design Plan/Storyboard/Wireframe 등)에는 "느리지만 정상
   * 진행 중인 응답"을 중간에 끊고 처음부터 재시도하게 만들어, 누적 재시도 시간이 오히려
   * maxDuration을 넘겨버리는 역효과를 낸다(2026-09-14 실사용 — Customer Requirements에
   * 문서 전문을 붙여넣은 긴 입력에서 재현). 이런 호출은 재시도 횟수를 줄이고 단일 시도의
   * 타임아웃을 늘려(예: retries:0, timeoutMs:270000) maxDuration 안에서 한 번의 시도가
   * 끝까지 진행되도록 해야 한다. 지정하지 않으면 기존 기본값 그대로 동작한다(하위 호환).
   */
  timeoutMs?: number;
  retries?: number;
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
