import { getAgent } from "@/lib/agents/registry";

export type ConnectionStatus =
  | "Installed"
  | "Not Installed"
  | "Connected"
  | "Unreachable"
  | "Configured"
  | "Not Configured";

export interface ProviderStatus {
  id: string;
  name: string;
  provider: string;
  status: ConnectionStatus;
  model: string | null;
  detail?: string;
}

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";

async function checkOllama(): Promise<ProviderStatus> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      return { id: "ollama", name: "Local AI", provider: "Ollama", status: "Unreachable", model: null };
    }

    const data: unknown = await response.json();
    const models =
      typeof data === "object" && data !== null && Array.isArray((data as { models?: unknown }).models)
        ? ((data as { models: { name?: string }[] }).models)
        : [];

    return {
      id: "ollama",
      name: "Local AI",
      provider: "Ollama",
      status: "Connected",
      model: models[0]?.name ?? null,
      detail: `${models.length}개 모델 설치됨`,
    };
  } catch {
    return {
      id: "ollama",
      name: "Local AI",
      provider: "Ollama",
      status: "Unreachable",
      model: null,
      detail: `${OLLAMA_HOST}에 연결할 수 없습니다.`,
    };
  }
}

async function checkAgentInstalled(
  id: "claude-code" | "cursor",
  name: string,
  provider: string
): Promise<ProviderStatus> {
  const agent = getAgent(id);
  const available = agent ? await agent.isAvailable() : false;

  return {
    id,
    name,
    provider,
    status: available ? "Installed" : "Not Installed",
    model: null,
  };
}

/**
 * OpenAI/Gemini "configured" means the API key env var is present — the same
 * non-live-call semantics packages/cli/src/providers/manager.ts uses for its
 * own `configured` field. No live API validation call is made (avoids cost
 * and requires no new dependency on that CLI package).
 */
function checkEnvConfigured(
  id: "openai" | "gemini",
  name: string,
  provider: string,
  apiKeyEnvVar: string,
  defaultModel: string,
  modelEnvVar: string
): ProviderStatus {
  const configured = Boolean(process.env[apiKeyEnvVar]);

  return {
    id,
    name,
    provider,
    status: configured ? "Configured" : "Not Configured",
    model: configured ? process.env[modelEnvVar] || defaultModel : null,
    detail: configured ? undefined : `${apiKeyEnvVar} 환경 변수가 설정되지 않았습니다.`,
  };
}

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const [claudeCode, cursor, ollama] = await Promise.all([
    checkAgentInstalled("claude-code", "Claude Code", "Anthropic"),
    checkAgentInstalled("cursor", "Cursor", "Cursor"),
    checkOllama(),
  ]);

  const openai = checkEnvConfigured("openai", "OpenAI", "OpenAI", "OPENAI_API_KEY", "gpt-4o-mini", "OPENAI_MODEL");
  const gemini = checkEnvConfigured(
    "gemini",
    "Gemini",
    "Google",
    "GEMINI_API_KEY",
    "gemini-1.5-flash",
    "GEMINI_MODEL"
  );

  return [claudeCode, cursor, ollama, openai, gemini];
}
