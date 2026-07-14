import { Command } from "commander";
import chalk from "chalk";
import { getProviderManager } from "../providers/manager.js";
import { listUsage, summarizeUsage } from "../providers/usage.js";
import { ProviderError } from "../providers/types.js";

function handleProviderError(error: unknown): never {
  if (error instanceof ProviderError) {
    console.log(chalk.red(`❌ [${error.provider}] ${error.message}`));
  } else {
    console.log(chalk.red("❌ Provider command failed."));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  }
  process.exit(1);
}

/** `ai provider list [--json]` */
async function providerListCommand(options: { json?: boolean } = {}): Promise<void> {
  const manager = getProviderManager();
  const providers = await manager.listProviders();

  if (options.json) {
    console.log(JSON.stringify({ success: true, providers }));
    return;
  }

  providers.forEach((provider) => {
    const badges = [provider.isDefault ? "default" : null, provider.configured ? "configured" : "not configured"]
      .filter(Boolean)
      .join(", ");
    console.log(`${provider.id} (${badges})`);
  });
}

/** `ai provider use <id>` */
async function providerUseCommand(id: string): Promise<void> {
  if (!id) {
    console.log(chalk.red("❌ Provider id is required."));
    console.log(chalk.yellow("Usage: ai provider use <id>"));
    process.exit(1);
  }

  try {
    const manager = getProviderManager();
    await manager.setDefaultProvider(id);
    console.log(chalk.green(`✅ Default provider set to "${id}".`));
  } catch (error) {
    handleProviderError(error);
  }
}

/** `ai provider test [id]` */
async function providerTestCommand(id?: string): Promise<void> {
  try {
    const manager = getProviderManager();
    const resolvedId = await manager.resolveProviderId(id);

    if (!resolvedId) {
      console.log(chalk.yellow("⚠️ No provider specified and no default provider configured."));
      return;
    }

    const provider = await manager.getProvider(resolvedId);
    const ok = await provider.validate();

    if (ok) {
      console.log(chalk.green(`✅ ${provider.name} (${provider.id}) is configured and reachable.`));
    } else {
      console.log(chalk.red(`❌ ${provider.name} (${provider.id}) is not configured (missing API key/host).`));
      process.exit(1);
    }
  } catch (error) {
    handleProviderError(error);
  }
}

/**
 * `ai provider models [id]`와 top-level `ai models [id]`가 공유하는 조회 로직.
 * 하나의 구현, 두 개의 진입점(마켓플레이스의 flat/grouped 명령 공유 패턴과 동일).
 */
export async function resolveProviderModels(
  id?: string
): Promise<{ providerId: string; providerName: string; models: string[] } | null> {
  const manager = getProviderManager();
  const resolvedId = await manager.resolveProviderId(id);

  if (!resolvedId) {
    return null;
  }

  const provider = await manager.getProvider(resolvedId);
  const models = await provider.models();

  return { providerId: provider.id, providerName: provider.name, models };
}

/** `ai provider models [id]` */
async function providerModelsCommand(id?: string): Promise<void> {
  try {
    const result = await resolveProviderModels(id);

    if (!result) {
      console.log(chalk.yellow("⚠️ No provider specified and no default provider configured."));
      return;
    }

    if (result.models.length === 0) {
      console.log(chalk.yellow(`⚠️ No models returned by ${result.providerName}.`));
      return;
    }

    result.models.forEach((model) => console.log(model));
  } catch (error) {
    handleProviderError(error);
  }
}

/** `ai provider set-key <id> <key>` */
async function providerSetKeyCommand(id: string, key: string): Promise<void> {
  if (!id || !key) {
    console.log(chalk.red("❌ Provider id and key are required."));
    console.log(chalk.yellow("Usage: ai provider set-key <id> <key>"));
    process.exit(1);
  }

  try {
    const manager = getProviderManager();
    const field = id === "ollama" ? "host" : "apiKey";
    await manager.setProviderConfig(id, { [field]: key });
    console.log(chalk.green(`✅ ${field === "host" ? "Host" : "API key"} saved for "${id}".`));
  } catch (error) {
    handleProviderError(error);
  }
}

/** `ai provider usage [--json]` */
async function providerUsageCommand(options: { json?: boolean }): Promise<void> {
  const entries = await listUsage(process.cwd());
  const summary = summarizeUsage(entries);

  if (options.json) {
    console.log(JSON.stringify({ success: true, summary, entries }));
    return;
  }

  console.log(chalk.cyan("\n📊 AI Token Usage"));
  console.log(chalk.gray("--------------------------------"));
  console.log(`Total calls: ${summary.totalCalls}`);
  console.log(`Total input tokens: ${summary.totalInputTokens}`);
  console.log(`Total output tokens: ${summary.totalOutputTokens}`);

  Object.entries(summary.byProvider).forEach(([providerId, bucket]) => {
    console.log(
      `  ${providerId}: ${bucket.calls} calls, ${bucket.inputTokens} in / ${bucket.outputTokens} out`
    );
  });
}

/** `ai provider <list|use|test|models>` 명령을 구성한다. */
export function buildProviderCommand(): Command {
  const provider = new Command("provider").description("LLM Provider 관리 (list/use/test/models)");

  provider
    .command("list")
    .option("--json", "JSON 형식으로 출력")
    .description("등록된 provider 목록과 기본값/설정 여부 출력")
    .action(async (options: { json?: boolean }) => {
      await providerListCommand(options);
    });

  provider
    .command("use")
    .argument("<id>", "Provider id (anthropic|openai|gemini|ollama)")
    .description("기본 provider 설정")
    .action(async (id: string) => {
      await providerUseCommand(id);
    });

  provider
    .command("test")
    .argument("[id]", "Provider id (생략 시 기본 provider)")
    .description("API 키/연결 상태 확인")
    .action(async (id?: string) => {
      await providerTestCommand(id);
    });

  provider
    .command("models")
    .argument("[id]", "Provider id (생략 시 기본 provider)")
    .description("사용 가능한 모델 목록 조회")
    .action(async (id?: string) => {
      await providerModelsCommand(id);
    });

  provider
    .command("set-key")
    .argument("<id>", "Provider id (anthropic|openai|gemini|ollama|openrouter)")
    .argument("<key>", "API key (ollama는 host)")
    .description("Provider의 API 키/host 저장")
    .action(async (id: string, key: string) => {
      await providerSetKeyCommand(id, key);
    });

  provider
    .command("usage")
    .option("--json", "JSON 형식으로 출력")
    .description("누적 토큰 사용량 조회")
    .action(async (options: { json?: boolean }) => {
      await providerUsageCommand(options);
    });

  return provider;
}
