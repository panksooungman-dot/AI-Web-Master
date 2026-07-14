import fs from "fs";
import path from "path";
import { execute } from "@/lib/commandEngine/engine";

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
 * `node packages/cli/dist/index.js <args> --json`를 실행한다 — lib/marketplace/registry.ts의
 * runMarketplaceCli()와 동일한 shell-out bridge 패턴. Next.js 앱은 packages/cli를 in-process로
 * import하지 않고, 항상 빌드된 CLI를 별도 프로세스로 실행해 --json 출력을 파싱한다.
 */
async function runAiCli(args: (string | undefined)[], cwd: string = process.cwd()): Promise<CliRunResult> {
  const cliEntry = path.join(process.cwd(), "packages", "cli", "dist", "index.js");

  if (!fs.existsSync(cliEntry)) {
    return {
      success: false,
      error: "packages/cli가 아직 빌드되지 않았습니다. `npm run build --workspace=@ai-business-os/cli`를 먼저 실행하세요.",
      raw: {},
    };
  }

  const tokens = [cliEntry, ...args.filter((a): a is string => Boolean(a)), "--json"];
  const command = `node ${tokens.map((t) => `"${t}"`).join(" ")}`;

  const result = await execute(command, { cwd, category: "development" });

  try {
    const parsed = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    return {
      success: Boolean(parsed.success),
      error: typeof parsed.error === "string" ? parsed.error : undefined,
      raw: parsed,
    };
  } catch {
    return {
      success: false,
      error: result.error ?? (result.stderr.trim() || "CLI 응답을 해석할 수 없습니다."),
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
