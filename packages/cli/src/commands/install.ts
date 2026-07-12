import path from "path";
import chalk from "chalk";
import {
  getMarketplaceProvider,
  isPackageType,
  MarketplaceError,
  TYPE_DIR_NAMES,
  type PackageType
} from "../marketplace/index.js";

export interface InstallOptions {
  type?: string;
}

/**
 * `ai install <name> [--type agent|workflow|skill]` — 마켓플레이스의 패키지를
 * 현재 프로젝트(cwd)의 agents/·workflows/·skills/ 폴더로 설치한다.
 */
export async function installCommand(name: string, options: InstallOptions = {}): Promise<void> {
  if (!name) {
    console.log(chalk.red("❌ Package name is required."));
    console.log(chalk.yellow("Usage: ai install <name> [--type agent|workflow|skill]"));
    process.exit(1);
  }

  console.log(chalk.cyan("\n📦 AI Business OS Marketplace Installer"));
  console.log(chalk.gray("--------------------------------"));

  let type: PackageType | undefined;

  if (options.type) {
    if (!isPackageType(options.type)) {
      console.log(chalk.red(`❌ Invalid --type "${options.type}". Use agent, workflow, or skill.`));
      process.exit(1);
    }
    type = options.type;
  }

  const provider = getMarketplaceProvider();
  const allEntries = await provider.list();
  const matches = allEntries.filter((entry) => entry.name === name && (!type || entry.type === type));

  if (matches.length === 0) {
    console.log(chalk.red(`❌ Package "${name}" was not found in the marketplace.`));
    process.exit(1);
  }

  if (matches.length > 1) {
    console.log(
      chalk.red(`❌ Multiple packages named "${name}" found: ${matches.map((m) => m.type).join(", ")}.`)
    );
    console.log(chalk.yellow(`   Use --type to disambiguate, e.g. ai install ${name} --type ${matches[0].type}`));
    process.exit(1);
  }

  const entry = matches[0];
  const targetDir = path.join(process.cwd(), TYPE_DIR_NAMES[entry.type], entry.name);

  try {
    await provider.install(entry.type, entry.name, targetDir);

    console.log(chalk.green(`✅ Package "${entry.name}" (${entry.type}) installed successfully.`));
    console.log(chalk.gray(`📦 v${entry.version} — ${entry.description}`));
    console.log(chalk.gray(`📁 ${targetDir}`));
  } catch (error) {
    if (error instanceof MarketplaceError && error.code === "DUPLICATE_PACKAGE") {
      console.log(chalk.yellow(`⚠️ ${error.message}`));
      return;
    }

    console.log(chalk.red(`❌ Failed to install "${name}".`));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}
