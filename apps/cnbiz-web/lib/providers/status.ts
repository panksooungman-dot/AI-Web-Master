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
 * OpenAI/Gemini는 이제 API 키 존재 여부만이 아니라 실제 모델 목록 엔드포인트를 호출해
 * 연결을 검증한다(packages/cli/src/providers/{openai,gemini}.ts의 `.validate()`와 동일한
 * "실제로 호출해본다" 원칙 — 다만 이 위젯은 대시보드 페이지 로드마다 그려지므로 CLI를
 * 서브프로세스로 띄우지 않고 Ollama처럼 짧은 타임아웃의 직접 fetch만 사용한다).
 * - 키 없음 → "Not Configured"
 * - 키 있음 + 실제 호출 성공 → "Configured"
 * - 키 있음 + 호출 실패(잘못된 키, 네트워크 오류 등) → "Unreachable"
 */
async function checkLiveApiProvider(
  id: "openai" | "gemini",
  name: string,
  provider: string,
  apiKeyEnvVar: string,
  modelEnvVar: string,
  fetchModels: (apiKey: string) => Promise<string[]>
): Promise<ProviderStatus> {
  const apiKey = process.env[apiKeyEnvVar];

  if (!apiKey) {
    return {
      id,
      name,
      provider,
      status: "Not Configured",
      model: null,
      detail: `${apiKeyEnvVar} 환경 변수가 설정되지 않았습니다.`,
    };
  }

  try {
    const models = await fetchModels(apiKey);
    return {
      id,
      name,
      provider,
      status: "Configured",
      model: process.env[modelEnvVar] || models[0] || null,
      detail: `${models.length}개 모델 사용 가능`,
    };
  } catch {
    return {
      id,
      name,
      provider,
      status: "Unreachable",
      model: null,
      detail: `${name} API에 연결할 수 없습니다(API 키를 확인하세요).`,
    };
  }
}

async function checkOpenAI(): Promise<ProviderStatus> {
  return checkLiveApiProvider("openai", "OpenAI", "OpenAI", "OPENAI_API_KEY", "OPENAI_MODEL", async (apiKey) => {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}`);
    }
    const data = (await response.json()) as { data?: { id: string }[] };
    return (data.data ?? []).map((model) => model.id);
  });
}

async function checkGemini(): Promise<ProviderStatus> {
  return checkLiveApiProvider("gemini", "Gemini", "Google", "GEMINI_API_KEY", "GEMINI_MODEL", async (apiKey) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }
    const data = (await response.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((model) => model.name.replace(/^models\//, ""));
  });
}

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const [claudeCode, cursor, ollama, openai, gemini] = await Promise.all([
    checkAgentInstalled("claude-code", "Claude Code", "Anthropic"),
    checkAgentInstalled("cursor", "Cursor", "Cursor"),
    checkOllama(),
    checkOpenAI(),
    checkGemini(),
  ]);

  return [claudeCode, cursor, ollama, openai, gemini];
}
