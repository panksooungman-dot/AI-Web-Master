import { spawn } from "node:child_process";
import { resolveCliEntry } from "@/lib/paths/repoRoot";

export interface ChatResult {
  success: boolean;
  content?: string;
  provider?: string;
  model?: string;
  simulated?: boolean;
  usage?: { inputTokens?: number; outputTokens?: number };
  error?: string;
}

export interface ProviderSummary {
  id: string;
  name: string;
  isDefault: boolean;
  configured: boolean;
}

export interface UsageEntry {
  timestamp: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  simulated: boolean;
}

export interface UsageSummary {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byProvider: Record<string, { calls: number; inputTokens: number; outputTokens: number }>;
}

interface CliRunResult {
  success: boolean;
  error?: string;
  raw: Record<string, unknown>;
}

/**
 * `node packages/cli/dist/index.js <args> --json`를 실행한다. lib/commandEngine/engine.ts의
 * execute()(명령을 통짜 문자열로 받아 PowerShell -Command로 재해석)를 쓰지 않고 node를 argv
 * 배열로 직접 spawn한다 — AI Analysis 프롬프트(buildAnalysisPrompt)처럼 큰따옴표가 여러 번
 * 반복되는 JSON 스키마 예시를 인자로 넘기면, PowerShell이 -Command 문자열을 파싱한 뒤 그
 * 결과를 다시 네이티브 프로세스(node) 호출용 커맨드라인으로 재구성하는 단계에서 인자 하나가
 * 둘로 쪼개진다(`error: too many arguments for 'chat'. Expected 1 argument but got 2.`) —
 * 자체 따옴표 이스케이프로는 막을 수 없는, PowerShell의 네이티브 인자 재구성 로직 자체의
 * 문제였다(2026-08-09 발견: ANTHROPIC_API_KEY가 정상 설정·정상 동작해도 항상 재현되어, AI
 * Analysis를 포함한 모든 chatViaCli 호출이 예외 없이 시뮬레이션 폴백으로 떨어지고 있었다).
 * argv 배열로 직접 spawn하면 이 중간 셸 문자열 계층 자체가 없어 안전하다.
 */
async function runAiCli(args: (string | undefined)[], cwd: string = process.cwd()): Promise<CliRunResult> {
  const cliEntry = resolveCliEntry();

  if (!cliEntry) {
    return {
      success: false,
      error: "packages/cli가 아직 빌드되지 않았습니다. `npm run build --workspace=@ai-business-os/cli`를 먼저 실행하세요.",
      raw: {},
    };
  }

  const tokens = [cliEntry, ...args.filter((a): a is string => Boolean(a)), "--json"];

  const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve) => {
    const child = spawn(process.execPath, tokens, { cwd, windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (data) => (out += data.toString()));
    child.stderr.on("data", (data) => (err += data.toString()));
    child.on("error", (spawnError) => resolve({ stdout: out, stderr: err || String(spawnError) }));
    child.on("close", () => resolve({ stdout: out, stderr: err }));
  });

  try {
    const parsed = JSON.parse(stdout.trim()) as Record<string, unknown>;
    return {
      success: Boolean(parsed.success),
      error: typeof parsed.error === "string" ? parsed.error : undefined,
      raw: parsed,
    };
  } catch {
    return {
      success: false,
      error: stderr.trim() || "CLI 응답을 해석할 수 없습니다.",
      raw: {},
    };
  }
}

export async function chatViaCli(
  message: string,
  options: { system?: string; provider?: string } = {}
): Promise<ChatResult> {
  const result = await runAiCli([
    "chat",
    message,
    options.system ? "--system" : undefined,
    options.system,
    options.provider ? "--provider" : undefined,
    options.provider,
  ]);

  return {
    success: result.success,
    content: result.raw.content as string | undefined,
    provider: result.raw.provider as string | undefined,
    model: result.raw.model as string | undefined,
    simulated: result.raw.simulated as boolean | undefined,
    usage: result.raw.usage as ChatResult["usage"],
    error: result.error,
  };
}

export async function listProvidersViaCli(): Promise<{
  success: boolean;
  providers: ProviderSummary[];
  error?: string;
}> {
  const result = await runAiCli(["provider", "list"]);
  return { success: result.success, providers: (result.raw.providers as ProviderSummary[]) ?? [], error: result.error };
}

export async function listUsageViaCli(): Promise<{
  success: boolean;
  summary?: UsageSummary;
  entries: UsageEntry[];
  error?: string;
}> {
  const result = await runAiCli(["provider", "usage"]);
  return {
    success: result.success,
    summary: result.raw.summary as UsageSummary | undefined,
    entries: (result.raw.entries as UsageEntry[]) ?? [],
    error: result.error,
  };
}
