import type { AIProvider } from "./provider.js";
import { createOpenAIProvider } from "./openai.js";
import { createAnthropicProvider } from "./anthropic.js";
import { createGeminiProvider } from "./gemini.js";
import { createOllamaProvider } from "./ollama.js";
import { ProviderError, type ProviderConfig } from "./types.js";

export type ProviderFactory = (config: ProviderConfig) => AIProvider;

/** 새 provider 추가 시 이 registry에만 등록하면 된다 (Future MCP provider 포함). */
const FACTORIES: Record<string, ProviderFactory> = {
  anthropic: createAnthropicProvider,
  openai: createOpenAIProvider,
  gemini: createGeminiProvider,
  ollama: createOllamaProvider
};

export function listProviderIds(): string[] {
  return Object.keys(FACTORIES);
}

export function createProvider(id: string, config: ProviderConfig): AIProvider {
  const factory = FACTORIES[id];

  if (!factory) {
    throw new ProviderError("NOT_FOUND", id, `Unknown provider "${id}". Available: ${listProviderIds().join(", ")}`);
  }

  return factory(config);
}
