import chalk from "chalk";
import { getMarketplaceProvider, isPackageType, type PackageType } from "../marketplace/index.js";

export interface SearchOptions {
  type?: string;
  json?: boolean;
}

/**
 * `ai search [keyword] [--type agent|workflow|skill] [--json]` — marketplace/index.json을
 * 읽어 게시된 패키지를 나열한다. keyword는 name/description에 대한 부분 일치.
 */
export async function searchCommand(keyword?: string, options: SearchOptions = {}): Promise<void> {
  let type: PackageType | undefined;

  if (options.type) {
    if (!isPackageType(options.type)) {
      console.log(chalk.red(`❌ Invalid --type "${options.type}". Use agent, workflow, or skill.`));
      process.exit(1);
    }
    type = options.type;
  }

  const provider = getMarketplaceProvider();
  const results = await provider.list({ type, keyword });

  if (options.json) {
    console.log(JSON.stringify({ success: true, results }));
    return;
  }

  console.log(chalk.cyan("\n🔍 AI Business OS Marketplace Search"));
  console.log(chalk.gray("--------------------------------"));

  if (results.length === 0) {
    console.log(chalk.yellow("⚠️ No packages found in the marketplace."));
    console.log(chalk.yellow("   Run `ai publish` to add packages first."));
    return;
  }

  console.log(chalk.green(`✅ Found ${results.length} package(s):\n`));

  results
    .slice()
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
    .forEach((entry, index) => {
      console.log(
        `${index + 1}. [${entry.type}] ${chalk.bold(entry.name)}@${entry.version} — ${entry.description} ${chalk.gray(
          `(${entry.author})`
        )}`
      );
    });

  console.log(chalk.gray("\n--------------------------------"));
  console.log(chalk.green("Search completed.\n"));
}
