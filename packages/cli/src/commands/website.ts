import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import type { DesignDocument } from "@cnbiz/design-system/types/design";
import { ask } from "../lib/prompt.js";
import { buildWebsite } from "../website/builder.js";
import { parseDesignDocument } from "../website/design-pages.js";
import { WEBSITE_TYPES, siteTypeLabel } from "../website/types.js";
import { WorkflowError } from "../workflow/types.js";
import { RuntimeError } from "../runtime/types.js";
import { ProviderError } from "../providers/types.js";
import { PromptError } from "../prompt/types.js";
import { ToolError } from "../tools/types.js";

export interface WebsiteCreateOptions {
  name?: string;
  siteType?: string;
  type?: string;
  audience?: string;
  brand?: string;
  language?: string;
  out?: string;
  provider?: string;
  designDocument?: string;
}

/**
 * `--design-document` 파일을 읽어 DesignDocument로 파싱한다. 읽기/파싱/스키마 어느 단계에서
 * 실패하든 그대로 종료한다 — 조용히 무시하고 템플릿으로 진행하면 "디자인을 반영했다"고
 * 믿게 만드는 잘못된 성공이 된다.
 */
async function readDesignDocument(filePath: string): Promise<DesignDocument> {
  let raw: unknown;

  try {
    raw = JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch (error) {
    console.log(chalk.red(`❌ Could not read --design-document "${filePath}".`));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }

  const parsed = parseDesignDocument(raw);
  if (!parsed) {
    console.log(
      chalk.red(
        `❌ "${filePath}" is not a valid DesignDocument ` +
          "(expected version/metadata.projectName/theme/pages[] — see packages/design-system/types/design.ts)."
      )
    );
    process.exit(1);
  }

  return parsed;
}

const SITE_TYPE_LIST = WEBSITE_TYPES.join(", ");

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

/** `ai website create` — Content Engine + 8단계 Planning 파이프라인으로 실제 Next.js 프로젝트를 생성한다. */
async function websiteCreateCommand(options: WebsiteCreateOptions): Promise<void> {
  console.log(chalk.cyan("\n🌐 AI Business OS Website Builder v2"));
  console.log(chalk.gray("--------------------------------"));

  const inputs = await resolveInputs(options);
  const siteTypeInput = options.siteType;

  if (!inputs.projectName || !inputs.businessType || !inputs.targetAudience || !inputs.brand || !inputs.language) {
    console.log(chalk.red("❌ Project Name, Business Type, Target Audience, Brand, and Language are all required."));
    process.exit(1);
  }

  if (siteTypeInput && !WEBSITE_TYPES.includes(siteTypeInput.trim().toLowerCase() as (typeof WEBSITE_TYPES)[number])) {
    console.log(
      chalk.yellow(`⚠ Unknown site type "${siteTypeInput}" — falling back to "website" (general). Valid types: ${SITE_TYPE_LIST}`)
    );
  }

  const designDocument = options.designDocument ? await readDesignDocument(options.designDocument) : undefined;

  try {
    const result = await buildWebsite({
      inputs,
      siteType: siteTypeInput,
      providerId: options.provider,
      outDir: options.out,
      designDocument
    });

    if (!result.workflowResult.success) {
      console.log(chalk.red("❌ Website Builder pipeline did not complete successfully — project was not generated."));
      process.exit(1);
    }

    console.log(chalk.green("\n✅ Project generated successfully."));
    console.log(chalk.gray(`📁 ${result.targetDir}`));
    console.log(chalk.gray(`🏷  Site Type: ${siteTypeLabel(result.siteType)} (${result.siteType})`));
    console.log(chalk.gray(`📄 Pages: Home, About, Services, Products, Pricing, FAQ, Blog, Contact, Privacy, Terms, 404`));

    if (result.designPages.length > 0) {
      console.log(
        chalk.cyan(`🎨 Design Document applied — ${result.designPages.length} page(s) generated from the design:`)
      );
      for (const route of result.designPages) {
        console.log(chalk.gray(`   ${route}`));
      }
    }

    if (result.contentSimulated) {
      console.log(
        chalk.yellow(
          "⚠ No LLM provider connected — content was generated deterministically. Run `ai provider set <id>` to enable AI-written copy on the next run."
        )
      );
    }

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
  const website = new Command("website").description("AI 파이프라인으로 프로덕션급 Next.js 웹사이트 프로젝트 생성");

  website
    .command("create")
    .description(
      "Business Analyst→Site Planner→...→Project Generator 8단계 계획 파이프라인 + Content Engine 실행 후 " +
        "11개 페이지·디자인 시스템·SEO·자산·배포 파일을 갖춘 Next.js 프로젝트 생성"
    )
    .option("--name <name>", "Project Name")
    .option("--site-type <type>", `Website Type (${SITE_TYPE_LIST}) — default: website`)
    .option("--type <type>", "Business Type (free text, e.g. \"dental clinic\")")
    .option("--audience <audience>", "Target Audience")
    .option("--brand <brand>", "Brand")
    .option("--language <language>", "Language")
    .option("--out <dir>", "출력 디렉터리 (기본값: ./<project-slug>)")
    .option("--provider <id>", "LLM provider (anthropic|openai|gemini|ollama). 생략 시 기본 provider 또는 시뮬레이션")
    .option(
      "--design-document <path>",
      "DesignDocument JSON 경로. 지정하면 React Generator로 변환해 해당 페이지를 스캐폴딩 위에 덮어쓴다"
    )
    .action(async (options: WebsiteCreateOptions) => {
      await websiteCreateCommand(options);
    });

  return website;
}
