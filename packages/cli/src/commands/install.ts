import path from "path";
import chalk from "chalk";
import {
  getMarketplaceProvider,
  isPackageType,
  MarketplaceError,
  TYPE_DIR_NAMES,
  type MarketplaceEntry,
  type MarketplaceProvider,
  type PackageType
} from "../marketplace/index.js";

export interface InstallOptions {
  type?: string;
  json?: boolean;
}

export interface InstallResult {
  entry: MarketplaceEntry;
  targetDir: string;
}

/**
 * Pure lookup + disambiguation — no console output, no process.exit. Shared by
 * `ai install`/`ai marketplace install` and by tests.
 */
export function resolveInstallEntry(
  entries: MarketplaceEntry[],
  name: string,
  type?: PackageType
): MarketplaceEntry {
  const matches = entries.filter((entry) => entry.name === name && (!type || entry.type === type));

  if (matches.length === 0) {
    throw new MarketplaceError("NOT_FOUND", `Package "${name}" was not found in the marketplace.`);
  }

  if (matches.length > 1) {
    throw new MarketplaceError(
      "AMBIGUOUS_PACKAGE",
      `Multiple packages named "${name}" found: ${matches.map((m) => m.type).join(", ")}. Use --type to disambiguate.`
    );
  }

  return matches[0];
}

/** Core: resolves the package and installs it into `<cwd>/<type>s/<name>`. Throws MarketplaceError. */
export async function installPackage(
  provider: MarketplaceProvider,
  cwd: string,
  name: string,
  type?: PackageType
): Promise<InstallResult> {
  const entries = await provider.list();
  const entry = resolveInstallEntry(entries, name, type);
  const targetDir = path.join(cwd, TYPE_DIR_NAMES[entry.type], entry.name);

  await provider.install(entry.type, entry.name, targetDir);

  return { entry, targetDir };
}

/**
 * `ai install <name> [--type agent|workflow|skill] [--json]` — 마켓플레이스의 패키지를
 * 현재 프로젝트(cwd)의 agents/·workflows/·skills/ 폴더로 설치한다.
 */
export async function installCommand(name: string, options: InstallOptions = {}): Promise<void> {
  if (!name) {
    console.log(chalk.red("❌ Package name is required."));
    console.log(chalk.yellow("Usage: ai install <name> [--type agent|workflow|skill]"));
    process.exit(1);
  }

  let type: PackageType | undefined;

  if (options.type) {
    if (!isPackageType(options.type)) {
      console.log(chalk.red(`❌ Invalid --type "${options.type}". Use agent, workflow, or skill.`));
      process.exit(1);
    }
    type = options.type;
  }

  if (!options.json) {
    console.log(chalk.cyan("\n📦 AI Business OS Marketplace Installer"));
    console.log(chalk.gray("--------------------------------"));
  }

  const provider = getMarketplaceProvider();

  try {
    const { entry, targetDir } = await installPackage(provider, process.cwd(), name, type);

    if (options.json) {
      console.log(JSON.stringify({ success: true, entry, targetDir }));
      return;
    }

    console.log(chalk.green(`✅ Package "${entry.name}" (${entry.type}) installed successfully.`));
    console.log(chalk.gray(`📦 v${entry.version} — ${entry.description}`));
    console.log(chalk.gray(`📁 ${targetDir}`));
  } catch (error) {
    if (error instanceof MarketplaceError && error.code === "DUPLICATE_PACKAGE") {
      if (options.json) {
        console.log(JSON.stringify({ success: false, code: error.code, error: error.message }));
        return;
      }
      console.log(chalk.yellow(`⚠️ ${error.message}`));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof MarketplaceError ? error.code : undefined;

    if (options.json) {
      console.log(JSON.stringify({ success: false, code, error: message }));
      process.exit(1);
    }

    console.log(chalk.red(`❌ Failed to install "${name}".`));
    console.error(chalk.red(message));
    process.exit(1);
  }
}
