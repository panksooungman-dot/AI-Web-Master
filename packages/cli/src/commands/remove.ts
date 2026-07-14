import chalk from "chalk";
import {
  discoverLocalPackages,
  getMarketplaceProvider,
  isPackageType,
  MarketplaceError,
  type DiscoveredPackage,
  type MarketplaceProvider,
  type PackageType
} from "../marketplace/index.js";

export interface RemoveOptions {
  type?: string;
  json?: boolean;
}

export interface RemoveResult {
  type: PackageType;
  name: string;
  targetDir: string;
}

/** Pure lookup + disambiguation over what's actually installed in `cwd`. */
export function resolveInstalledPackage(
  installed: DiscoveredPackage[],
  name: string,
  type?: PackageType
): DiscoveredPackage {
  const matches = installed.filter((pkg) => pkg.name === name && (!type || pkg.type === type));

  if (matches.length === 0) {
    throw new MarketplaceError("NOT_FOUND", `Package "${name}" is not installed.`);
  }

  if (matches.length > 1) {
    throw new MarketplaceError(
      "AMBIGUOUS_PACKAGE",
      `Multiple installed packages named "${name}" found: ${matches.map((m) => m.type).join(", ")}. Use --type to disambiguate.`
    );
  }

  return matches[0];
}

/** Core: finds the installed package by scanning cwd (not a separate tracking file) and uninstalls it. */
export async function removePackage(
  provider: MarketplaceProvider,
  cwd: string,
  name: string,
  type?: PackageType
): Promise<RemoveResult> {
  const installed = await discoverLocalPackages(cwd);
  const pkg = resolveInstalledPackage(installed, name, type);

  await provider.uninstall(pkg.type, pkg.name, pkg.dir);

  return { type: pkg.type, name: pkg.name, targetDir: pkg.dir };
}

/**
 * `ai remove <name> [--type agent|workflow|skill] [--json]` — 현재 프로젝트(cwd)의
 * agents/·workflows/·skills/에 실제로 설치된 패키지를 찾아 제거한다.
 */
export async function removeCommand(name: string, options: RemoveOptions = {}): Promise<void> {
  if (!name) {
    console.log(chalk.red("❌ Package name is required."));
    console.log(chalk.yellow("Usage: ai remove <package> [--type agent|workflow|skill]"));
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
    console.log(chalk.cyan("\n🗑 AI Business OS Remove"));
    console.log(chalk.gray("--------------------------------"));
  }

  const provider = getMarketplaceProvider();

  try {
    const result = await removePackage(provider, process.cwd(), name, type);

    if (options.json) {
      console.log(JSON.stringify({ success: true, ...result }));
      return;
    }

    console.log(chalk.green("✅ Package removed successfully."));
    console.log(chalk.gray(`📦 ${result.name} (${result.type})`));
    console.log(chalk.gray(`📁 ${result.targetDir}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof MarketplaceError ? error.code : undefined;

    if (options.json) {
      console.log(JSON.stringify({ success: false, code, error: message }));
      process.exit(1);
    }

    console.log(chalk.red("❌ Failed to remove package."));
    console.error(chalk.red(message));
    process.exit(1);
  }
}
