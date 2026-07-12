import { Command } from "commander";
import chalk from "chalk";
import { ask } from "../lib/prompt.js";
import { buildWebsite } from "../website/builder.js";
import { WorkflowError } from "../workflow/types.js";
import { RuntimeError } from "../runtime/types.js";
import { ProviderError } from "../providers/types.js";
import { PromptError } from "../prompt/types.js";
import { ToolError } from "../tools/types.js";

export interface WebsiteCreateOptions {
  name?: string;
  type?: string;
  audience?: string;
  brand?: string;
  language?: string;
  out?: string;
  provider?: string;
}

async function resolveInputs(options: WebsiteCreateOptions): Promise<{
  projectName: string;
  businessType: string;
  targetAudience: string;
  brand: string;
  language: string;
}> {
  const projectName = options.name ?? (await ask("Project Name: "));
  const businessType = options.type ?? (await ask("Business Type: "));
  const targetAudience = options.audience ?? (await ask("Target Audience: "));
  const brand = options.brand ?? (await ask("Brand: "));
  const language = options.language ?? (await ask("Language: "));

  return { projectName, businessType, targetAudience, brand, language };
}

/** `ai website create` — 8단계 AI 파이프라인으로 실제 Next.js 프로젝트를 생성한다. */
async function websiteCreateCommand(options: WebsiteCreateOptions): Promise<void> {
  console.log(chalk.cyan("\n🌐 AI Business OS Website Builder"));
  console.log(chalk.gray("--------------------------------"));

  const inputs = await resolveInputs(options);

  if (!inputs.projectName || !inputs.businessType || !inputs.targetAudience || !inputs.brand || !inputs.language) {
    console.log(chalk.red("❌ Project Name, Business Type, Target Audience, Brand, and Language are all required."));
    process.exit(1);
  }

  try {
    const result = await buildWebsite({
      inputs,
      providerId: options.provider,
      outDir: options.out
    });

    if (!result.workflowResult.success) {
      console.log(chalk.red("❌ Website Builder pipeline did not complete successfully — project was not generated."));
      process.exit(1);
    }

    console.log(chalk.green("\n✅ Project generated successfully."));
    console.log(chalk.gray(`📁 ${result.targetDir}`));
    console.log();
    console.log(chalk.yellow("Next steps:"));
    console.log(chalk.yellow(`  cd ${result.targetDir}`));
    console.log(chalk.yellow("  npm install"));
    console.log(chalk.yellow("  npm run dev"));
  } catch (error) {
    if (
      error instanceof WorkflowError ||
      error instanceof RuntimeError ||
      error instanceof PromptError
    ) {
      console.log(chalk.red(`❌ ${error.message}`));
    } else if (error instanceof ProviderError) {
      console.log(chalk.red(`❌ [${error.provider}] ${error.message}`));
    } else if (error instanceof ToolError) {
      console.log(chalk.red(`❌ [${error.tool}] ${error.message}`));
    } else {
      console.log(chalk.red("❌ Failed to generate website project."));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
    process.exit(1);
  }
}

/** `ai website create` 명령을 구성한다. */
export function buildWebsiteCommand(): Command {
  const website = new Command("website").description("AI 파이프라인으로 Next.js 웹사이트 프로젝트 생성");

  website
    .command("create")
    .description("Business Analyst→Site Planner→...→Project Generator 8단계 파이프라인 실행 후 Next.js 프로젝트 생성")
    .option("--name <name>", "Project Name")
    .option("--type <type>", "Business Type")
    .option("--audience <audience>", "Target Audience")
    .option("--brand <brand>", "Brand")
    .option("--language <language>", "Language")
    .option("--out <dir>", "출력 디렉터리 (기본값: ./<project-slug>)")
    .option("--provider <id>", "LLM provider (anthropic|openai|gemini|ollama). 생략 시 기본 provider 또는 시뮬레이션")
    .action(async (options: WebsiteCreateOptions) => {
      await websiteCreateCommand(options);
    });

  return website;
}
