import { providerFetchJson, providerFetchSseStream, type AIProvider } from "./provider.js";
import {
  ProviderError,
  type ChatRequest,
  type ChatResponse,
  type ChatStreamChunk,
  type ProviderConfig
} from "./types.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const BASE_URL = "https://api.openai.com/v1";

/** OpenAI Chat Completions API 구현. provider별 세부 로직은 이 파일 안에서만 다룬다. */
export function createOpenAIProvider(config: ProviderConfig): AIProvider {
  const apiKey = (config.apiKey ?? "").trim();

  function requireApiKey(): void {
    if (!apiKey) {
      throw new ProviderError("MISSING_API_KEY", "openai", "OPENAI_API_KEY is not configured.");
    }
  }

  return {
    id: "openai",
    name: "OpenAI",

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

      const data = (await providerFetchJson("openai", `${BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })) as { data?: { id: string }[] };

      return (data.data ?? []).map((model) => model.id);
    },

    async chat(request: ChatRequest): Promise<ChatResponse> {
      requireApiKey();

      const model = request.model ?? DEFAULT_MODEL;

      const data = (await providerFetchJson("openai", `${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens
        })
      })) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const content = data.choices?.[0]?.message?.content;

      if (typeof content !== "string") {
        throw new ProviderError("INVALID_RESPONSE", "openai", "OpenAI response did not include message content.");
      }

      const usage = data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : undefined;

      return { provider: "openai", model, content, usage };
    },

    async *chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk> {
      requireApiKey();

      const model = request.model ?? DEFAULT_MODEL;

      const stream = providerFetchSseStream("openai", `${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: true
        })
      });

      for await (const event of stream) {
        if (event.data === "[DONE]") {
          yield { delta: "", done: true, model };
          return;
        }

        let parsed: { choices?: { delta?: { content?: string } }[] };
        try {
          parsed = JSON.parse(event.data);
        } catch {
          continue;
        }

        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          yield { delta, done: false, model };
        }
      }

      yield { delta: "", done: true, model };
    }
  };
}
