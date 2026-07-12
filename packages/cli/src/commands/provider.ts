import { Command } from "commander";
import chalk from "chalk";
import { getProviderManager } from "../providers/manager.js";
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

/** `ai provider list` */
async function providerListCommand(): Promise<void> {
  const manager = getProviderManager();
  const providers = await manager.listProviders();

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

/** `ai provider models [id]` */
async function providerModelsCommand(id?: string): Promise<void> {
  try {
    const manager = getProviderManager();
    const resolvedId = await manager.resolveProviderId(id);

    if (!resolvedId) {
      console.log(chalk.yellow("⚠️ No provider specified and no default provider configured."));
      return;
    }

    const provider = await manager.getProvider(resolvedId);
    const models = await provider.models();

    if (models.length === 0) {
      console.log(chalk.yellow(`⚠️ No models returned by ${provider.name}.`));
      return;
    }

    models.forEach((model) => console.log(model));
  } catch (error) {
    handleProviderError(error);
  }
}

/** `ai provider <list|use|test|models>` 명령을 구성한다. */
export function buildProviderCommand(): Command {
  const provider = new Command("provider").description("LLM Provider 관리 (list/use/test/models)");

  provider
    .command("list")
    .description("등록된 provider 목록과 기본값/설정 여부 출력")
    .action(async () => {
      await providerListCommand();
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

  return provider;
}
