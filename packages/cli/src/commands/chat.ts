import chalk from "chalk";
import { getProviderManager } from "../providers/manager.js";
import { ProviderError } from "../providers/types.js";
import { recordTask } from "../tasks/ledger.js";

export interface ChatOptions {
  system?: string;
  provider?: string;
  json?: boolean;
}

const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant inside AI Business OS.";

/**
 * `ai chat [message] [--system] [--provider] [--json]` — ProviderManager.complete()를
 * 그대로 재사용한다(새 실행 로직 없음). 호출마다 .runtime/tasks.json에 기록되어
 * `ai task list/retry`의 대상이 된다.
 */
export async function chatCommand(message: string | undefined, options: ChatOptions = {}): Promise<void> {
  if (!message) {
    console.log(chalk.red("❌ Message is required."));
    console.log(chalk.yellow('Usage: ai chat "<message>" [--system <text>] [--provider <id>]'));
    process.exit(1);
  }

  const cwd = process.cwd();
  const systemPrompt = options.system ?? DEFAULT_SYSTEM_PROMPT;

  try {
    const manager = getProviderManager(cwd);
    const completion = await manager.complete({
      providerId: options.provider,
      systemPrompt,
      userPrompt: message,
      fallbackLabel: `Chat: "${message.slice(0, 60)}"`
    });

    await recordTask(cwd, {
      kind: "chat",
      providerId: completion.provider ?? options.provider,
      systemPrompt,
      userPrompt: message,
      status: "success",
      simulated: completion.simulated,
      result: completion.text
    });

    if (options.json) {
      console.log(
        JSON.stringify({
          success: true,
          content: completion.text,
          provider: completion.provider,
          model: completion.model,
          simulated: completion.simulated,
          usage: completion.usage
        })
      );
      return;
    }

    console.log(chalk.cyan("\n💬 AI Chat"));
    console.log(chalk.gray("--------------------------------"));
    if (completion.simulated) {
      console.log(chalk.yellow(completion.text));
    } else {
      console.log(completion.text);
      console.log(chalk.gray(`\n(${completion.provider} / ${completion.model})`));
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);

    await recordTask(cwd, {
      kind: "chat",
      providerId: options.provider,
      systemPrompt,
      userPrompt: message,
      status: "failed",
      simulated: false,
      error: errMessage
    });

    if (options.json) {
      const code = error instanceof ProviderError ? error.code : undefined;
      console.log(JSON.stringify({ success: false, code, error: errMessage }));
      process.exit(1);
    }

    if (error instanceof ProviderError) {
      console.log(chalk.red(`❌ [${error.provider}] ${error.message}`));
    } else {
      console.log(chalk.red("❌ Chat request failed."));
      console.error(chalk.red(errMessage));
    }
    process.exit(1);
  }
}
