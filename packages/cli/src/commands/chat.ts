import chalk from "chalk";
import { getProviderManager } from "../providers/manager.js";
import { ProviderError, type ChatImage } from "../providers/types.js";
import { recordTask } from "../tasks/ledger.js";

export interface ChatOptions {
  system?: string;
  provider?: string;
  json?: boolean;
  stream?: boolean;
  image?: string[];
}

const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant inside AI Business OS.";

// Anthropic's per-image limit is 5MB of base64-encoded data; cap the source fetch below that so
// we never build a request the API will reject outright. 6 images keeps a single chat() call
// well within typical prompt/latency budgets — a business inquiry with a handful of reference
// images is the intended use case here, not a bulk image-analysis pipeline.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 6;

/**
 * `--image <url>` 인자들을 실제로 fetch해 base64로 인코딩한다. 하나가 실패해도 나머지는
 * 계속 시도한다(첨부파일 중 하나가 깨져 있다고 전체 분석이 시뮬레이션으로 폴백하는 것은
 * 과한 실패 모드다) — 실패한 이미지는 stderr 경고만 남기고 건너뛴다.
 */
async function resolveImages(urls: string[] | undefined): Promise<ChatImage[]> {
  if (!urls || urls.length === 0) return [];

  const images: ChatImage[] = [];
  for (const url of urls.slice(0, MAX_IMAGES)) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[chat] 이미지를 가져오지 못했습니다 (${response.status}): ${url}`);
        continue;
      }
      const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
      if (!mediaType.startsWith("image/")) {
        console.error(`[chat] 이미지가 아닌 콘텐츠 타입(${mediaType})이라 건너뜁니다: ${url}`);
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        console.error(`[chat] 이미지가 5MB를 초과해 건너뜁니다 (${buffer.byteLength} bytes): ${url}`);
        continue;
      }
      images.push({ mediaType, base64: buffer.toString("base64") });
    } catch (error) {
      console.error(`[chat] 이미지 fetch 실패: ${url} — ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return images;
}

/**
 * `ai chat [message] [--system] [--provider] [--json] [--stream] [--image <url>]` —
 * ProviderManager.complete()/streamComplete()를 그대로 재사용한다(새 실행 로직 없음). 호출마다
 * .runtime/tasks.json에 기록되어 `ai task list/retry`의 대상이 된다. `--json`과 `--stream`을
 * 함께 주면 스트리밍 대신 기존 단일 JSON 응답으로 폴백한다(기존 --json 소비자와의 호환을 위해).
 * `--image`는 스트리밍 경로에서는 지원하지 않는다(vision은 apps/cnbiz-web의 AI Analysis처럼
 * `--json` 1회성 호출로만 쓰인다).
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
    const images = await resolveImages(options.image);
    const manager = getProviderManager(cwd);
    const completion = await manager.complete({
      providerId: options.provider,
      systemPrompt,
      userPrompt: message,
      fallbackLabel: `Chat: "${message.slice(0, 60)}"`,
      images
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
