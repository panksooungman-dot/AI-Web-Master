import { Command } from "commander";
import chalk from "chalk";
import {
  createPrompt,
  getLatestVersion,
  getPrompt,
  listPrompts,
  type PromptRecord
} from "../promptLibrary/registry.js";
import { renderPromptTemplate } from "../prompt/renderer.js";
import { getProviderManager } from "../providers/manager.js";
import { recordTask } from "../tasks/ledger.js";

function printPromptSummary(prompt: PromptRecord): void {
  const latest = getLatestVersion(prompt);
  console.log(`${prompt.id}  [${prompt.category}]  ${prompt.name}  (v${latest.version})`);
}

/** `ai prompt list [--category] [--json]` */
async function promptListCommand(options: { category?: string; json?: boolean }): Promise<void> {
  const prompts = await listPrompts(process.cwd(), options.category);

  if (options.json) {
    console.log(JSON.stringify({ success: true, prompts }));
    return;
  }

  if (prompts.length === 0) {
    console.log(chalk.yellow("⚠️ No prompts found."));
    return;
  }

  console.log(chalk.cyan("\n📚 Prompt Library"));
  console.log(chalk.gray("--------------------------------"));
  prompts.forEach(printPromptSummary);
}

/** `ai prompt show <id> [--json]` */
async function promptShowCommand(id: string, options: { json?: boolean }): Promise<void> {
  const prompt = await getPrompt(process.cwd(), id);

  if (!prompt) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: `Prompt "${id}" was not found.` }));
      process.exit(1);
    }
    console.log(chalk.red(`❌ Prompt "${id}" was not found.`));
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify({ success: true, prompt }));
    return;
  }

  const latest = getLatestVersion(prompt);
  printPromptSummary(prompt);
  console.log(chalk.gray(prompt.description));
  console.log(`\n${latest.content}`);
}

/** `ai prompt create --name --content [--description] [--category] [--variables a,b] [--json]` */
async function promptCreateCommand(options: {
  name?: string;
  description?: string;
  category?: string;
  content?: string;
  variables?: string;
  json?: boolean;
}): Promise<void> {
  if (!options.name || !options.content) {
    console.log(chalk.red("❌ --name and --content are required."));
    process.exit(1);
  }

  const variables = options.variables
    ? options.variables.split(",").map((v) => v.trim()).filter(Boolean)
    : undefined;

  const prompt = await createPrompt(
    process.cwd(),
    options.name,
    options.description ?? "",
    options.content,
    options.category ?? "General",
    variables
  );

  if (options.json) {
    console.log(JSON.stringify({ success: true, prompt }));
    return;
  }

  console.log(chalk.green(`✅ Prompt "${prompt.name}" created (${prompt.id}).`));
}

/** `ai prompt preview <id> [--variables '{"key":"value"}'] [--json]` */
async function promptPreviewCommand(id: string, options: { variables?: string; json?: boolean }): Promise<void> {
  const prompt = await getPrompt(process.cwd(), id);

  if (!prompt) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: `Prompt "${id}" was not found.` }));
      process.exit(1);
    }
    console.log(chalk.red(`❌ Prompt "${id}" was not found.`));
    process.exit(1);
  }

  let variables: Record<string, unknown> = {};
  if (options.variables) {
    try {
      variables = JSON.parse(options.variables);
    } catch {
      console.log(chalk.red("❌ --variables must be valid JSON."));
      process.exit(1);
    }
  }

  const latest = getLatestVersion(prompt);
  const rendered = renderPromptTemplate(latest.content, variables);

  if (options.json) {
    console.log(JSON.stringify({ success: true, rendered, version: latest.version }));
    return;
  }

  console.log(chalk.cyan("\n👁  Prompt Preview"));
  console.log(chalk.gray("--------------------------------"));
  console.log(rendered);
}

/** `ai prompt execute <id> --agent <providerId> [--variables json] [--json]` */
async function promptExecuteCommand(
  id: string,
  options: { agent?: string; variables?: string; json?: boolean }
): Promise<void> {
  const cwd = process.cwd();
  const prompt = await getPrompt(cwd, id);

  if (!prompt) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: `Prompt "${id}" was not found.` }));
      process.exit(1);
    }
    console.log(chalk.red(`❌ Prompt "${id}" was not found.`));
    process.exit(1);
  }

  let variables: Record<string, unknown> = {};
  if (options.variables) {
    try {
      variables = JSON.parse(options.variables);
    } catch {
      console.log(chalk.red("❌ --variables must be valid JSON."));
      process.exit(1);
    }
  }

  const latest = getLatestVersion(prompt);
  const rendered = renderPromptTemplate(latest.content, variables);

  try {
    const manager = getProviderManager(cwd);
    const completion = await manager.complete({
      providerId: options.agent,
      systemPrompt: rendered,
      userPrompt: "Proceed with the instructions above.",
      fallbackLabel: `Prompt "${prompt.name}"`
    });

    await recordTask(cwd, {
      kind: "prompt",
      providerId: completion.provider ?? options.agent,
      systemPrompt: rendered,
      userPrompt: "Proceed with the instructions above.",
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
          simulated: completion.simulated
        })
      );
      return;
    }

    console.log(chalk.cyan(`\n▶️  Executed "${prompt.name}"`));
    console.log(chalk.gray("--------------------------------"));
    console.log(completion.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await recordTask(cwd, {
      kind: "prompt",
      providerId: options.agent,
      systemPrompt: rendered,
      userPrompt: "Proceed with the instructions above.",
      status: "failed",
      simulated: false,
      error: message
    });

    if (options.json) {
      console.log(JSON.stringify({ success: false, error: message }));
      process.exit(1);
    }

    console.log(chalk.red(`❌ Execution failed: ${message}`));
    process.exit(1);
  }
}

/** `ai prompt <list|show|create|preview|execute>` 명령을 구성한다. */
export function buildPromptCommand(): Command {
  const prompt = new Command("prompt").description("Prompt Library 관리 (list/show/create/preview/execute)");

  prompt
    .command("list")
    .option("--category <category>", "카테고리로 필터링")
    .option("--json", "JSON 형식으로 출력")
    .description("등록된 프롬프트 목록 조회")
    .action(async (options: { category?: string; json?: boolean }) => {
      await promptListCommand(options);
    });

  prompt
    .command("show")
    .argument("<id>", "Prompt id")
    .option("--json", "JSON 형식으로 출력")
    .description("프롬프트 상세 조회")
    .action(async (id: string, options: { json?: boolean }) => {
      await promptShowCommand(id, options);
    });

  prompt
    .command("create")
    .option("--name <name>", "프롬프트 이름")
    .option("--description <description>", "설명")
    .option("--category <category>", "카테고리 (기본값: General)")
    .option("--content <content>", "프롬프트 내용 ({{variable}} 사용 가능)")
    .option("--variables <list>", "쉼표로 구분된 변수 목록 (예: brand,audience)")
    .option("--json", "JSON 형식으로 출력")
    .description("새 프롬프트 생성")
    .action(
      async (options: {
        name?: string;
        description?: string;
        category?: string;
        content?: string;
        variables?: string;
        json?: boolean;
      }) => {
        await promptCreateCommand(options);
      }
    );

  prompt
    .command("preview")
    .argument("<id>", "Prompt id")
    .option("--variables <json>", "변수 JSON (예: '{\"brand\":\"Acme\"}')")
    .option("--json", "JSON 형식으로 출력")
    .description("변수 치환된 프롬프트 미리보기 (실행하지 않음)")
    .action(async (id: string, options: { variables?: string; json?: boolean }) => {
      await promptPreviewCommand(id, options);
    });

  prompt
    .command("execute")
    .argument("<id>", "Prompt id")
    .option("--agent <providerId>", "LLM provider id (생략 시 기본 provider)")
    .option("--variables <json>", "변수 JSON")
    .option("--json", "JSON 형식으로 출력")
    .description("프롬프트를 실행한다 (ProviderManager.complete() 재사용)")
    .action(async (id: string, options: { agent?: string; variables?: string; json?: boolean }) => {
      await promptExecuteCommand(id, options);
    });

  return prompt;
}
