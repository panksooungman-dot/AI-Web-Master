import chalk from "chalk";
import { getProviderManager } from "../providers/manager.js";
import { ProviderError } from "../providers/types.js";
import { recordTask } from "../tasks/ledger.js";

export interface ChatOptions {
  system?: string;
  provider?: string;
  json?: boolean;
  stream?: boolean;
}

const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant inside AI Business OS.";

/**
 * `ai chat [message] [--system] [--provider] [--json] [--stream]` — ProviderManager.complete()/
 * streamComplete()를 그대로 재사용한다(새 실행 로직 없음). 호출마다 .runtime/tasks.json에
 * 기록되어 `ai task list/retry`의 대상이 된다. `--json`과 `--stream`을 함께 주면 스트리밍
 * 대신 기존 단일 JSON 응답으로 폴백한다(기존 --json 소비자와의 호환을 위해).
 */
export async function chatCommand(message: string | undefined, options: ChatOptions = {}): Promise<void> {
  if (!message) {
    console.log(chalk.red("❌ Message is required."));
    console.log(chalk.yellow('Usage: ai chat "<message>" [--system <text>] [--provider <id>] [--stream]'));
    process.exit(1);
  }

  const cwd = process.cwd();
  const systemPrompt = options.system ?? DEFAULT_SYSTEM_PROMPT;

  if (options.stream && !options.json) {
    await streamChat(cwd, message, systemPrompt, options);
    return;
  }

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

/**
 * `--stream` 경로 — ProviderManager.streamComplete()가 yield하는 청크를 도착하는 대로
 * stdout에 이어 쓴다. chatCommand()와 동일하게 완료/실패를 task ledger에 기록한다.
 */
async function streamChat(cwd: string, message: string, systemPrompt: string, options: ChatOptions): Promise<void> {
  const manager = getProviderManager(cwd);
  let fullText = "";
  let provider: string | undefined;
  let model: string | undefined;
  let simulated = false;

  console.log(chalk.cyan("\n💬 AI Chat (streaming)"));
  console.log(chalk.gray("--------------------------------"));

  try {
    for await (const chunk of manager.streamComplete({
      providerId: options.provider,
      systemPrompt,
      userPrompt: message,
      fallbackLabel: `Chat: "${message.slice(0, 60)}"`
    })) {
      provider = chunk.provider ?? provider;
      model = chunk.model ?? model;
      simulated = chunk.delta.startsWith("[simulated]") || simulated;

      if (chunk.delta) {
        process.stdout.write(simulated ? chalk.yellow(chunk.delta) : chunk.delta);
        fullText += chunk.delta;
      }
    }

    process.stdout.write("\n");
    if (!simulated && provider) {
      console.log(chalk.gray(`(${provider} / ${model})`));
    }

    await recordTask(cwd, {
      kind: "chat",
      providerId: provider ?? options.provider,
      systemPrompt,
      userPrompt: message,
      status: "success",
      simulated,
      result: fullText
    });
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

    if (error instanceof ProviderError) {
      console.log(chalk.red(`❌ [${error.provider}] ${error.message}`));
    } else {
      console.log(chalk.red("❌ Chat stream failed."));
      console.error(chalk.red(errMessage));
    }
    process.exit(1);
  }
}
