import { spawn } from "node:child_process";
import { resolveCliEntry, resolveCliWorkingDir } from "@/lib/paths/repoRoot";

export interface ChatResult {
  success: boolean;
  content?: string;
  provider?: string;
  model?: string;
  simulated?: boolean;
  usage?: { inputTokens?: number; outputTokens?: number };
  error?: string;
}

/**
 * lib/design/*-generator.ts 5개(Design Plan/Storyboard/Wireframe/Claude Design/Prototype)가
 * 공유하는 chatViaCli() 호출 옵션 — 전부 큰 JSON을 한 번에 생성하고, 각자의 API 라우트가
 * Vercel maxDuration=300으로 실행 시간 제한을 받는다(app/api/design 하위 각 라우트 참고). 기본
 * 재시도 정책(최대 3회 × 120초 ≈ 360초, packages/cli/src/providers/provider.ts)은 "느리지만
 * 정상 진행 중인 응답"을 중간에 끊고 처음부터 재시도하게 만들어, 누적 재시도 시간이 오히려
 * maxDuration을 넘겨버리는 역효과를 낸다(2026-09-14 실사용 — Customer Requirements에 문서
 * 전문을 붙여넣은 긴 입력에서 재현: "네트워크 연결이 끊겼거나 서버 응답 시간이 초과됐습니다").
 * 재시도 없이 단일 시도에 270초(=maxDuration 300초에서 subprocess spawn 등 오버헤드 여유 30초를
 * 뺀 값)를 온전히 쓰도록 override한다 — 입력을 요약해서 줄이라고 안내하는 대신, 큰 입력을
 * 그대로 받아들이면서 시간 예산만 재배분하는 방식.
 */
export const LARGE_GENERATION_CHAT_OPTIONS = { timeoutMs: 270000, retries: 0 } as const;

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
 *
 * cwd 기본값은 반드시 resolveCliWorkingDir()(os.tmpdir() 기반)이어야 한다 — process.cwd()로
 * 두면 Vercel 프로덕션(읽기 전용 `/var/task/...` 번들)에서 `ai chat`이 `.runtime/tasks.json`을
 * 기록하려다 `ENOENT: no such file or directory, mkdir '/var/task/apps/cnbiz-web/.runtime'`로
 * 즉시 죽는다(2026-08-09 발견 — 2026-08-05에 website generation에서 같은 원인으로 이미 한 번
 * 겪었던 문제, lib/paths/repoRoot.ts의 resolveCliWorkingDir() 주석 참고). ANTHROPIC_API_KEY를
 * 프로덕션에 처음 설정한 뒤에야 이 코드 경로가 실제로 실행되면서 드러났다 — 그 전까지는 CLI가
 * 항상 provider 미설정으로 즉시 시뮬레이션 응답을 반환해 이 mkdir을 아예 타지 않았다.
 */
async function runAiCli(args: (string | undefined)[], cwd: string = resolveCliWorkingDir()): Promise<CliRunResult> {
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
  options: {
    system?: string;
    provider?: string;
    timeoutMs?: number;
    retries?: number;
    /** 큰 JSON 스키마 호출자가 기본값(16000, anthropic.ts)으로도 출력이 잘릴 때 override한다. */
    maxTokens?: number;
  } = {}
): Promise<ChatResult> {
  const result = await runAiCli([
    "chat",
    message,
    options.system ? "--system" : undefined,
    options.system,
    options.provider ? "--provider" : undefined,
    options.provider,
    options.timeoutMs !== undefined ? "--timeout" : undefined,
    options.timeoutMs !== undefined ? String(options.timeoutMs) : undefined,
    options.retries !== undefined ? "--retries" : undefined,
    options.retries !== undefined ? String(options.retries) : undefined,
    options.maxTokens !== undefined ? "--max-tokens" : undefined,
    options.maxTokens !== undefined ? String(options.maxTokens) : undefined,
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
