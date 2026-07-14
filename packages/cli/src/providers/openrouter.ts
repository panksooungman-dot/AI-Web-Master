import { providerFetchJson, type AIProvider } from "./provider.js";
import { ProviderError, type ChatRequest, type ChatResponse, type ProviderConfig } from "./types.js";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const BASE_URL = "https://openrouter.ai/api/v1";

/** OpenRouter — OpenAI 호환 Chat Completions API 구현. provider별 세부 로직은 이 파일 안에서만 다룬다. */
export function createOpenRouterProvider(config: ProviderConfig): AIProvider {
  const apiKey = (config.apiKey ?? "").trim();

  function requireApiKey(): void {
    if (!apiKey) {
      throw new ProviderError("MISSING_API_KEY", "openrouter", "OPENROUTER_API_KEY is not configured.");
    }
  }

  function headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };
  }

  return {
    id: "openrouter",
    name: "OpenRouter",

    async validate(): Promise<boolean> {
      try {
        await this.models();
        return true;
      } catch {
        return false;
      }
    },

    async models(): Promise<string[]> {
      requireApiKey();

      const data = (await providerFetchJson("openrouter", `${BASE_URL}/models`, {
        headers: headers()
      })) as { data?: { id: string }[] };

      return (data.data ?? []).map((model) => model.id);
    },

    async chat(request: ChatRequest): Promise<ChatResponse> {
      requireApiKey();

      const model = request.model ?? DEFAULT_MODEL;

      const data = (await providerFetchJson("openrouter", `${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: headers(),
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
        throw new ProviderError("INVALID_RESPONSE", "openrouter", "OpenRouter response did not include message content.");
      }

      const usage = data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : undefined;

      return { provider: "openrouter", model, content, usage };
    }
  };
}
