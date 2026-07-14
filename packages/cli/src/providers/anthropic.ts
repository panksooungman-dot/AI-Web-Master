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

  /** chat()/chatStream()이 공유하는 system/conversation 분리 로직. */
  function buildBody(request: ChatRequest, model: string, stream: boolean): string {
    const system = request.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const conversation = request.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role, content: message.content }));

    return JSON.stringify({
      model,
      system: system || undefined,
      messages: conversation.length > 0 ? conversation : [{ role: "user", content: "Proceed." }],
      max_tokens: request.maxTokens ?? 1024,
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
