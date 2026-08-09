import { providerFetchJson, providerFetchSseStream, type AIProvider } from "./provider.js";
import {
  ProviderError,
  type ChatRequest,
  type ChatResponse,
  type ChatStreamChunk,
  type ProviderConfig
} from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-5";
const BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

/** Anthropic Messages API 구현. provider별 세부 로직은 이 파일 안에서만 다룬다. */
export function createAnthropicProvider(config: ProviderConfig): AIProvider {
  const apiKey = (config.apiKey ?? "").trim();

  function requireApiKey(): void {
    if (!apiKey) {
      throw new ProviderError("MISSING_API_KEY", "anthropic", "ANTHROPIC_API_KEY is not configured.");
    }
  }

  function headers(): Record<string, string> {
    return {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json"
    };
  }

  /**
   * chat()/chatStream()이 공유하는 system/conversation 분리 로직. `request.images`가 있으면
   * 마지막 user 메시지 하나에만 붙인다 — Anthropic Messages API는 메시지별로 content를
   * string 또는 블록 배열로 받으므로, 이미지가 있는 메시지만 배열 형태(이미지 블록들 +
   * 텍스트 블록)로 바꾸고 나머지는 기존과 동일한 문자열 그대로 둔다.
   */
  function buildBody(request: ChatRequest, model: string, stream: boolean): string {
    const system = request.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const nonSystem = request.messages.filter((message) => message.role !== "system");
    const lastUserIndex = nonSystem.reduce(
      (found, message, index) => (message.role === "user" ? index : found),
      -1
    );

    const conversation = nonSystem.map((message, index) => {
      if (index === lastUserIndex && request.images && request.images.length > 0) {
        return {
          role: message.role,
          content: [
            ...request.images.map((image) => ({
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 }
            })),
            { type: "text", text: message.content }
          ]
        };
      }
      return { role: message.role, content: message.content };
    });

    return JSON.stringify({
      model,
      system: system || undefined,
      messages: conversation.length > 0 ? conversation : [{ role: "user", content: "Proceed." }],
      // Anthropic requires max_tokens (unlike OpenAI/Gemini/OpenRouter, which omit the cap entirely
      // when request.maxTokens is undefined). 1024 was too low a default for structured-JSON callers
      // (apps/cnbiz-web's Estimate/Specification/Timeline/Contract/Proposal generators can need
      // 2000-3000+ output tokens for their larger schemas) and would silently truncate mid-JSON,
      // guaranteeing a JSON.parse failure. 4096 was then found insufficient too (2026-08-09):
      // lib/design/generator.ts's Design Plan landed right at the 4096 ceiling in a passing run
      // (4004 output tokens). Raised to 8192 — still not enough for lib/design/wireframe-generator.ts
      // (desktop/tablet/mobile layouts for every screen): confirmed hitting exactly 8192 output
      // tokens with `usage.outputTokens: 8192` and mid-string truncation. 16000 gives that schema
      // real headroom; smaller callers stop well short of the cap on their own so this doesn't
      // change their cost/latency.
      max_tokens: request.maxTokens ?? 16000,
      temperature: request.temperature,
      stream
    });
  }

  return {
    id: "anthropic",
    name: "Anthropic",

    async validate(): Promise<boolean> {
      if (!apiKey) {
        return false;
      }
      try {
        await this.models();
        return true;
      } catch {
        return false;
      }
    },

    async models(): Promise<string[]> {
      requireApiKey();

      const data = (await providerFetchJson("anthropic", `${BASE_URL}/models`, { headers: headers() })) as {
        data?: { id: string }[];
      };

      return (data.data ?? []).map((model) => model.id);
    },

    async chat(request: ChatRequest): Promise<ChatResponse> {
      requireApiKey();

      const model = request.model ?? DEFAULT_MODEL;

      const data = (await providerFetchJson("anthropic", `${BASE_URL}/messages`, {
        method: "POST",
        headers: headers(),
        body: buildBody(request, model, false)
      })) as {
        content?: { type: string; text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      const text = data.content?.find((block) => block.type === "text")?.text;

      if (typeof text !== "string") {
        throw new ProviderError("INVALID_RESPONSE", "anthropic", "Anthropic response did not include text content.");
      }

      const usage = data.usage
        ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
        : undefined;

      return { provider: "anthropic", model, content: text, usage };
    },

    async *chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk> {
      requireApiKey();

      const model = request.model ?? DEFAULT_MODEL;

      const stream = providerFetchSseStream("anthropic", `${BASE_URL}/messages`, {
        method: "POST",
        headers: headers(),
        body: buildBody(request, model, true)
      });

      let inputTokens: number | undefined;
      let outputTokens: number | undefined;

      for await (const event of stream) {
        let parsed: {
          type?: string;
          message?: { usage?: { input_tokens?: number } };
          delta?: { type?: string; text?: string; stop_reason?: string };
          usage?: { output_tokens?: number };
        };

        try {
          parsed = JSON.parse(event.data);
        } catch {
          continue;
        }

        if (parsed.type === "message_start") {
          inputTokens = parsed.message?.usage?.input_tokens ?? inputTokens;
        } else if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          yield { delta: parsed.delta.text ?? "", done: false, model };
        } else if (parsed.type === "message_delta") {
          outputTokens = parsed.usage?.output_tokens ?? outputTokens;
        } else if (parsed.type === "message_stop") {
          yield { delta: "", done: true, model, usage: { inputTokens, outputTokens } };
          return;
        }
      }

      yield { delta: "", done: true, model, usage: { inputTokens, outputTokens } };
    }
  };
}
