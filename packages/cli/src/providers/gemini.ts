import { providerFetchJson, type AIProvider } from "./provider.js";
import { ProviderError, type ChatRequest, type ChatResponse, type ProviderConfig } from "./types.js";

const DEFAULT_MODEL = "gemini-1.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/** Google Gemini (Generative Language API) 구현. provider별 세부 로직은 이 파일 안에서만 다룬다. */
export function createGeminiProvider(config: ProviderConfig): AIProvider {
  const apiKey = (config.apiKey ?? "").trim();

  function requireApiKey(): void {
    if (!apiKey) {
      throw new ProviderError("MISSING_API_KEY", "gemini", "GEMINI_API_KEY is not configured.");
    }
  }

  return {
    id: "gemini",
    name: "Google Gemini",

    async validate(): Promise<boolean> {
      return apiKey.length > 0;
    },

    async models(): Promise<string[]> {
      requireApiKey();

      const data = (await providerFetchJson(
        "gemini",
        `${BASE_URL}/models?key=${encodeURIComponent(apiKey)}`,
        {}
      )) as { models?: { name: string }[] };

      return (data.models ?? []).map((model) => model.name.replace(/^models\//, ""));
    },

    async chat(request: ChatRequest): Promise<ChatResponse> {
      requireApiKey();

      const model = request.model ?? DEFAULT_MODEL;
      const system = request.messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n\n");
      const contents = request.messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }]
        }));

      const data = (await providerFetchJson(
        "gemini",
        `${BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Proceed." }] }],
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
            generationConfig: {
              temperature: request.temperature,
              maxOutputTokens: request.maxTokens
            }
          })
        }
      )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };

      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");

      if (!text) {
        throw new ProviderError("INVALID_RESPONSE", "gemini", "Gemini response did not include content.");
      }

      return { provider: "gemini", model, content: text };
    }
  };
}
