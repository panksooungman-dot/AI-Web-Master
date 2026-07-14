import chalk from "chalk";
import { resolveProviderModels } from "./provider.js";
import { ProviderError } from "../providers/types.js";

export interface ModelsOptions {
  json?: boolean;
}

/**
 * `ai models [provider]` — `ai provider models`와 동일한 조회 로직(`resolveProviderModels`)을
 * 공유하는 top-level 단축 명령. 새 조회 로직을 만들지 않는다.
 */
export async function modelsCommand(provider: string | undefined, options: ModelsOptions = {}): Promise<void> {
  try {
    const result = await resolveProviderModels(provider);

    if (!result) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: "No provider specified and no default provider configured." }));
        return;
      }
      console.log(chalk.yellow("⚠️ No provider specified and no default provider configured."));
      return;
    }

    if (options.json) {
      console.log(JSON.stringify({ success: true, provider: result.providerId, models: result.models }));
      return;
    }

    if (result.models.length === 0) {
      console.log(chalk.yellow(`⚠️ No models returned by ${result.providerName}.`));
      return;
    }

    result.models.forEach((model) => console.log(model));
  } catch (error) {
    if (options.json) {
      const code = error instanceof ProviderError ? error.code : undefined;
      const message = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({ success: false, code, error: message }));
      return;
    }

    if (error instanceof ProviderError) {
      console.log(chalk.red(`❌ [${error.provider}] ${error.message}`));
    } else {
      console.log(chalk.red("❌ Failed to fetch models."));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
    process.exit(1);
  }
}
