import fs from "fs-extra";
import path from "path";
import { createProvider, listProviderIds } from "./registry.js";
import type { AIProvider } from "./provider.js";
import { recordUsage } from "./usage.js";
import {
  ProviderError,
  type ChatImage,
  type ChatMessage,
  type ChatStreamChunk,
  type ProviderConfig,
  type ProvidersFile
} from "./types.js";

function configFile(cwd: string): string {
  return path.join(cwd, ".runtime", "config", "providers.json");
}

const DEFAULT_CONFIG: ProvidersFile = {
  default: "anthropic",
  providers: {
    anthropic: { apiKey: "${ANTHROPIC_API_KEY}" },
    openai: { apiKey: "${OPENAI_API_KEY}" },
    gemini: { apiKey: "${GEMINI_API_KEY}" },
    ollama: { host: "${OLLAMA_HOST}" },
    openrouter: { apiKey: "${OPENROUTER_API_KEY}" }
  }
};

/**
 * 없으면 기본 템플릿(env 변수 참조 형태)으로 생성해 반환한다 — 비밀값은 파일에 직접 쓰지 않는다.
 * 항상 DEFAULT_CONFIG의 깊은 복제본을 반환한다 — setDefaultProvider()/setProviderConfig()처럼
 * 반환값을 직접 mutate하는 호출자가 모듈 스코프의 DEFAULT_CONFIG 자체를 오염시키지 않도록 한다.
 */
export async function readProvidersConfig(cwd: string): Promise<ProvidersFile> {
  const file = configFile(cwd);

  if (!(await fs.pathExists(file))) {
    await fs.ensureDir(path.dirname(file));
    await fs.writeJson(file, DEFAULT_CONFIG, { spaces: 2 });
    return structuredClone(DEFAULT_CONFIG);
  }

  try {
    return await fs.readJson(file);
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export async function writeProvidersConfig(cwd: string, config: ProvidersFile): Promise<void> {
  const file = configFile(cwd);
  await fs.ensureDir(path.dirname(file));
  await fs.writeJson(file, config, { spaces: 2 });
}

function interpolateEnv(value: string): string {
  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name: string) => process.env[name] ?? "");
}

function resolveConfig(raw: Record<string, string> = {}): ProviderConfig {
  const resolved: ProviderConfig = {};
  for (const [key, value] of Object.entries(raw)) {
    resolved[key] = typeof value === "string" ? interpolateEnv(value) : value;
  }
  return resolved;
}

export interface ProviderSummary {
  id: string;
  name: string;
  isDefault: boolean;
  configured: boolean;
}

/** Env var that overrides the configured default provider. See resolveDefaultProviderId(). */
export const DEFAULT_PROVIDER_ENV = "AI_DEFAULT_PROVIDER";

/**
 * Precedence for "which provider runs when the caller didn't name one":
 * `AI_DEFAULT_PROVIDER` env var > the `default` field in .runtime/config/providers.json >
 * DEFAULT_CONFIG's "anthropic".
 *
 * The env var exists because on a serverless deployment the config file is the wrong knob:
 * it lives under the process cwd, which is a per-invocation temp directory there, so
 * `ai provider set-default` writes a file that is gone by the next request and the default
 * silently reverts to anthropic. An env var is the only setting that survives.
 *
 * An unrecognised value is ignored rather than fatal — a typo in a deployment variable should
 * not take the whole pipeline down — but it warns on stderr instead of failing over in
 * silence, because a wrong-but-quiet default is exactly the failure mode that makes these
 * bugs so hard to spot. stderr, not stdout: callers parse stdout as JSON (lib/ai/bridge.ts).
 */
export function resolveDefaultProviderId(configDefault?: string | null): string | null {
  const requested = process.env[DEFAULT_PROVIDER_ENV]?.trim();

  if (requested) {
    if (listProviderIds().includes(requested)) {
      return requested;
    }

    console.warn(
      `[providers] ${DEFAULT_PROVIDER_ENV}="${requested}" is not a known provider ` +
        `(available: ${listProviderIds().join(", ")}). Falling back to ` +
        `"${configDefault ?? DEFAULT_CONFIG.default}".`
    );
  }

  return configDefault ?? null;
}

/**
 * Provider 등록/로드/기본값/API 키 검증을 담당하는 재사용 계층.
 * Agent Runtime·Workflow Engine·Orchestrator는 이 매니저 하나만 알면 되고,
 * provider별 세부 로직(URL/헤더/파싱)은 providers/<vendor>.ts 안에만 존재한다.
 */
export class ProviderManager {
  constructor(private readonly cwd: string) {}

  async listProviders(): Promise<ProviderSummary[]> {
    const config = await readProvidersConfig(this.cwd);
    const effectiveDefault = resolveDefaultProviderId(config.default);

    return listProviderIds().map((id) => {
      const resolved = resolveConfig(config.providers[id]);
      const configured = Object.values(resolved).some((value) => value.trim().length > 0);
      return { id, name: id, isDefault: effectiveDefault === id, configured };
    });
  }

  async getDefaultProviderId(): Promise<string | null> {
    const config = await readProvidersConfig(this.cwd);
    return resolveDefaultProviderId(config.default);
  }

  async setDefaultProvider(id: string): Promise<void> {
    if (!listProviderIds().includes(id)) {
      throw new ProviderError(
        "NOT_FOUND",
        id,
        `Unknown provider "${id}". Available: ${listProviderIds().join(", ")}`
      );
    }

    const config = await readProvidersConfig(this.cwd);
    config.default = id;
    await writeProvidersConfig(this.cwd, config);

    // The write succeeded but has no effect while the env var is set — say so rather than
    // let the caller believe the default changed.
    const override = process.env[DEFAULT_PROVIDER_ENV]?.trim();
    if (override && override !== id && listProviderIds().includes(override)) {
      console.warn(
        `[providers] default written as "${id}", but ${DEFAULT_PROVIDER_ENV}="${override}" ` +
          `takes precedence and stays in effect. Unset it to use the configured default.`
      );
    }
  }

  /**
   * 요구사항 — API Key Management(쓰기 경로). 지정한 provider의 설정 항목(예: apiKey/host)을
   * 부분 갱신한다. 기존 값은 patch에 없는 키는 그대로 유지된다.
   */
  async setProviderConfig(id: string, patch: Record<string, string>): Promise<void> {
    if (!listProviderIds().includes(id)) {
      throw new ProviderError(
        "NOT_FOUND",
        id,
        `Unknown provider "${id}". Available: ${listProviderIds().join(", ")}`
      );
    }

    const config = await readProvidersConfig(this.cwd);
    config.providers[id] = { ...(config.providers[id] ?? {}), ...patch };
    await writeProvidersConfig(this.cwd, config);
  }

  /** id 생략 시 config의 default를 사용한다. 둘 다 없으면 null(호출자가 시뮬레이션으로 폴백 가능). */
  async resolveProviderId(id?: string): Promise<string | null> {
    if (id) {
      return id;
    }
    return this.getDefaultProviderId();
  }

  async getProvider(id: string): Promise<AIProvider> {
    const config = await readProvidersConfig(this.cwd);
    const raw = config.providers[id] ?? {};
    return createProvider(id, resolveConfig(raw));
  }

  /**
   * Resolve → chat → simulate 폴백을 한 곳에서 처리하는 공용 헬퍼.
   * Agent Runtime(runtime/executor.ts)과 Website Builder Content Engine(website/content.ts)이
   * 동일한 이 메서드를 재사용한다 — provider 호출/시뮬레이션 로직이 두 곳에 중복되지 않는다.
   * 명시적으로 요청된 provider(`options.providerId`)가 실패하면 감추지 않고 그대로 던진다.
   */
  async complete(options: CompleteOptions): Promise<CompleteResult> {
    const resolvedProviderId = await this.resolveProviderId(options.providerId);

    if (!resolvedProviderId) {
      return { text: `[simulated] ${options.fallbackLabel} — no LLM connected yet.`, simulated: true };
    }

    const messages: ChatMessage[] = [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userPrompt }
    ];

    try {
      const provider = await this.getProvider(resolvedProviderId);
      const response = await provider.chat({ messages, images: options.images });

      await recordUsage(this.cwd, {
        provider: response.provider,
        model: response.model,
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
        simulated: false
      });

      return {
        text: response.content,
        provider: response.provider,
        model: response.model,
        simulated: false,
        usage: response.usage
      };
    } catch (error) {
      if (options.providerId) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      return {
        text: `[simulated] ${options.fallbackLabel} — provider "${resolvedProviderId}" unavailable (${reason}).`,
        simulated: true
      };
    }
  }

  /**
   * complete()의 스트리밍 버전 — resolve → chatStream → simulate 폴백 로직을 공유한다.
   * provider가 chatStream을 지원하지 않으면(gemini/ollama/openrouter) 일반 chat()을 호출해
   * 결과를 단일 청크로 yield한다(호출자 입장에서는 항상 스트림 인터페이스로 소비 가능).
   * 명시적으로 요청된 provider(`options.providerId`)가 실패하면 감추지 않고 그대로 던진다.
   */
  async *streamComplete(options: CompleteOptions): AsyncGenerator<ChatStreamChunk & { provider?: string; model?: string }> {
    const resolvedProviderId = await this.resolveProviderId(options.providerId);

    if (!resolvedProviderId) {
      yield { delta: `[simulated] ${options.fallbackLabel} — no LLM connected yet.`, done: true };
      return;
    }

    const messages: ChatMessage[] = [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userPrompt }
    ];

    try {
      const provider = await this.getProvider(resolvedProviderId);

      if (!provider.chatStream) {
        const response = await provider.chat({ messages });

        await recordUsage(this.cwd, {
          provider: response.provider,
          model: response.model,
          inputTokens: response.usage?.inputTokens ?? 0,
          outputTokens: response.usage?.outputTokens ?? 0,
          simulated: false
        });

        yield {
          delta: response.content,
          done: true,
          provider: response.provider,
          model: response.model,
          usage: response.usage
        };
        return;
      }

      let inputTokens = 0;
      let outputTokens = 0;
      let model = provider.id;

      for await (const chunk of provider.chatStream({ messages })) {
        if (chunk.model) {
          model = chunk.model;
        }
        if (chunk.usage) {
          inputTokens = chunk.usage.inputTokens ?? inputTokens;
          outputTokens = chunk.usage.outputTokens ?? outputTokens;
        }

        yield { ...chunk, provider: provider.id };

        if (chunk.done) {
          await recordUsage(this.cwd, {
            provider: provider.id,
            model,
            inputTokens,
            outputTokens,
            simulated: false
          });
          return;
        }
      }
    } catch (error) {
      if (options.providerId) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      yield {
        delta: `[simulated] ${options.fallbackLabel} — provider "${resolvedProviderId}" unavailable (${reason}).`,
        done: true
      };
    }
  }
}

export interface CompleteOptions {
  /** 명시적으로 요청된 provider id. 생략 시 providers.json의 default를 사용한다. */
  providerId?: string;
  systemPrompt: string;
  userPrompt: string;
  /** provider가 없거나 실패했을 때 [simulated] 메시지에 포함되는 설명. */
  fallbackLabel: string;
  /** anthropic만 실제로 소비한다(vision) — 다른 provider는 조용히 무시. */
  images?: ChatImage[];
}

export interface CompleteResult {
  text: string;
  provider?: string;
  model?: string;
  simulated: boolean;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export function getProviderManager(cwd: string = process.cwd()): ProviderManager {
  return new ProviderManager(cwd);
}
