import chalk from "chalk";
import {
  discoverLocalPackages,
  getMarketplaceProvider,
  readManifest,
  MarketplaceError,
  type MarketplaceEntry,
  type MarketplaceProvider
} from "../marketplace/index.js";

export interface PublishOptions {
  json?: boolean;
}

export interface PublishOutcome {
  published: MarketplaceEntry[];
  skipped: { name: string; type: string; reason: string }[];
  failed: { name: string; type: string; error: string }[];
}

/**
 * Core: publishes every discovered local package under `cwd` (or just `name` if given).
 * Never throws for individual package failures — collects them into the result.
 */
export async function publishPackages(
  provider: MarketplaceProvider,
  cwd: string,
  name?: string
): Promise<PublishOutcome> {
  const discovered = await discoverLocalPackages(cwd);
  const candidates = name ? discovered.filter((pkg) => pkg.name === name) : discovered;

  const outcome: PublishOutcome = { published: [], skipped: [], failed: [] };

  for (const pkg of candidates) {
    try {
      const manifest = await readManifest(pkg.dir);
      const entry = await provider.publish(pkg.dir, manifest);
      outcome.published.push(entry);
    } catch (error) {
      if (error instanceof MarketplaceError && error.code === "ALREADY_PUBLISHED") {
        outcome.skipped.push({ name: pkg.name, type: pkg.type, reason: error.message });
        continue;
      }

      outcome.failed.push({
        name: pkg.name,
        type: pkg.type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return outcome;
}

/**
 * `ai publish [name] [--json]` — cwd의 agents/·workflows/·skills/ 폴더에서
 * (ai create로) 생성된 패키지를 감지해 marketplace/index.json에 등록하고
 * 패키지 파일을 marketplace/<type>s/<name>으로 복사한다.
 * name을 생략하면 발견된 모든 로컬 패키지를 대상으로 한다.
 */
export async function publishCommand(name?: string, options: PublishOptions = {}): Promise<void> {
  const provider = getMarketplaceProvider();
  const outcome = await publishPackages(provider, process.cwd(), name);
  const touchedNothing =
    outcome.published.length === 0 && outcome.skipped.length === 0 && outcome.failed.length === 0;

  if (touchedNothing) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: "no candidates found" }));
      process.exit(1);
    }

    console.log(chalk.cyan("\n🚀 AI Business OS Marketplace Publisher"));
    console.log(chalk.gray("--------------------------------"));

    if (name) {
      console.log(chalk.red(`❌ Package "${name}" was not found in agents/, workflows/, or skills/.`));
      process.exit(1);
    }

    console.log(chalk.yellow("⚠️ No generated packages found (agents/, workflows/, skills/)."));
    console.log(chalk.yellow("   Run `ai create agent|workflow|skill <name>` first."));
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ success: outcome.failed.length === 0, ...outcome }));
    if (outcome.failed.length > 0) process.exit(1);
    return;
  }

  console.log(chalk.cyan("\n🚀 AI Business OS Marketplace Publisher"));
  console.log(chalk.gray("--------------------------------"));

  outcome.published.forEach((entry) => {
    console.log(chalk.green(`✅ Published ${entry.type}/${entry.name}@${entry.version}`));
    console.log(chalk.gray(`   ${entry.description}`));
  });
  outcome.skipped.forEach((s) => console.log(chalk.yellow(`⚠️ ${s.reason}`)));
  outcome.failed.forEach((f) => {
    console.log(chalk.red(`❌ Failed to publish "${f.name}" (${f.type}).`));
    console.error(chalk.red(f.error));
  });

  console.log(chalk.gray("--------------------------------"));
  console.log(chalk.green(`Marketplace: ${outcome.published.length} package(s) published.`));

  if (outcome.failed.length > 0) {
    process.exit(1);
  }
}
