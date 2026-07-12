import { providerFetchJson, type AIProvider } from "./provider.js";
import { ProviderError, type ChatRequest, type ChatResponse, type ProviderConfig } from "./types.js";

const DEFAULT_MODEL = "llama3";
const DEFAULT_HOST = "http://localhost:11434";

/** 로컬 Ollama 서버 구현. API 키 대신 host(OLLAMA_HOST, 기본 localhost:11434)를 사용한다. */
export function createOllamaProvider(config: ProviderConfig): AIProvider {
  const configuredHost = (config.host ?? "").trim();
  const host = (configuredHost.length > 0 ? configuredHost : DEFAULT_HOST).replace(/\/$/, "");

  return {
    id: "ollama",
    name: "Ollama",

    async validate(): Promise<boolean> {
      try {
        await providerFetchJson("ollama", `${host}/api/tags`, {}, 3000);
        return true;
      } catch {
        return false;
      }
    },

    async models(): Promise<string[]> {
      const data = (await providerFetchJson("ollama", `${host}/api/tags`, {})) as {
        models?: { name: string }[];
      };

      return (data.models ?? []).map((model) => model.name);
    },

    async chat(request: ChatRequest): Promise<ChatResponse> {
      const model = request.model ?? DEFAULT_MODEL;

      const data = (await providerFetchJson("ollama", `${host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: request.messages,
          stream: false,
          options: { temperature: request.temperature }
        })
      })) as { message?: { content?: string } };

      const content = data.message?.content;

      if (typeof content !== "string") {
        throw new ProviderError("INVALID_RESPONSE", "ollama", "Ollama response did not include message content.");
      }

      return { provider: "ollama", model, content };
    }
  };
}
