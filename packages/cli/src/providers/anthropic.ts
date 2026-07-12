import { providerFetchJson, type AIProvider } from "./provider.js";
import { ProviderError, type ChatRequest, type ChatResponse, type ProviderConfig } from "./types.js";

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

  return {
    id: "anthropic",
    name: "Anthropic",

    async validate(): Promise<boolean> {
      return apiKey.length > 0;
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
      const system = request.messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n\n");
      const conversation = request.messages
        .filter((message) => message.role !== "system")
        .map((message) => ({ role: message.role, content: message.content }));

      const data = (await providerFetchJson("anthropic", `${BASE_URL}/messages`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          model,
          system: system || undefined,
          messages: conversation.length > 0 ? conversation : [{ role: "user", content: "Proceed." }],
          max_tokens: request.maxTokens ?? 1024,
          temperature: request.temperature
        })
      })) as { content?: { type: string; text?: string }[] };

      const text = data.content?.find((block) => block.type === "text")?.text;

      if (typeof text !== "string") {
        throw new ProviderError("INVALID_RESPONSE", "anthropic", "Anthropic response did not include text content.");
      }

      return { provider: "anthropic", model, content: text };
    }
  };
}
