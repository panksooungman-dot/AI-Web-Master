import chalk from "chalk";
import { discoverLocalPackages, getMarketplaceProvider, readManifest, MarketplaceError } from "../marketplace/index.js";

/**
 * `ai publish [name]` — cwd의 agents/·workflows/·skills/ 폴더에서
 * (ai create로) 생성된 패키지를 감지해 marketplace/index.json에 등록하고
 * 패키지 파일을 marketplace/<type>s/<name>으로 복사한다.
 * name을 생략하면 발견된 모든 로컬 패키지를 대상으로 한다.
 */
export async function publishCommand(name?: string): Promise<void> {
  console.log(chalk.cyan("\n🚀 AI Business OS Marketplace Publisher"));
  console.log(chalk.gray("--------------------------------"));

  const discovered = await discoverLocalPackages();
  const candidates = name ? discovered.filter((pkg) => pkg.name === name) : discovered;

  if (candidates.length === 0) {
    if (name) {
      console.log(chalk.red(`❌ Package "${name}" was not found in agents/, workflows/, or skills/.`));
      process.exit(1);
    }

    console.log(chalk.yellow("⚠️ No generated packages found (agents/, workflows/, skills/)."));
    console.log(chalk.yellow("   Run `ai create agent|workflow|skill <name>` first."));
    return;
  }

  const provider = getMarketplaceProvider();
  let publishedCount = 0;
  let hadFailure = false;

  for (const pkg of candidates) {
    try {
      const manifest = await readManifest(pkg.dir);
      const entry = await provider.publish(pkg.dir, manifest);
      publishedCount += 1;
      console.log(chalk.green(`✅ Published ${entry.type}/${entry.name}@${entry.version}`));
      console.log(chalk.gray(`   ${entry.description}`));
    } catch (error) {
      if (error instanceof MarketplaceError && error.code === "ALREADY_PUBLISHED") {
        console.log(chalk.yellow(`⚠️ ${error.message}`));
        continue;
      }

      hadFailure = true;
      console.log(chalk.red(`❌ Failed to publish "${pkg.name}" (${pkg.type}).`));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  }

  console.log(chalk.gray("--------------------------------"));
  console.log(chalk.green(`Marketplace: ${publishedCount} package(s) published.`));

  if (hadFailure) {
    process.exit(1);
  }
}
