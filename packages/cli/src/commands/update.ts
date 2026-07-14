import chalk from "chalk";
import {
  discoverLocalPackages,
  getInstalledPackages,
  getMarketplaceProvider,
  isPackageType,
  MarketplaceError,
  readManifest,
  type InstalledPackageInfo,
  type MarketplaceProvider,
  type PackageType
} from "../marketplace/index.js";
import { resolveInstalledPackage } from "./remove.js";

export interface UpdateOptions {
  type?: string;
  json?: boolean;
  all?: boolean;
}

export interface UpdateResult {
  type: PackageType;
  name: string;
  from: string;
  to: string;
  updated: boolean;
}

/** Core: updates one installed package to the latest published version (no-op if already current). */
export async function updatePackage(
  provider: MarketplaceProvider,
  cwd: string,
  name: string,
  type?: PackageType
): Promise<UpdateResult> {
  const installed = await discoverLocalPackages(cwd);
  const pkg = resolveInstalledPackage(installed, name, type);
  const manifest = await readManifest(pkg.dir);

  const published = await provider.list();
  const latest = published.find((entry) => entry.type === pkg.type && entry.name === pkg.name);

  if (!latest) {
    throw new MarketplaceError(
      "NOT_FOUND",
      `Package "${name}" (${pkg.type}) is installed but no longer published in the marketplace.`
    );
  }

  if (latest.version === manifest.version) {
    return { type: pkg.type, name: pkg.name, from: manifest.version, to: manifest.version, updated: false };
  }

  await provider.uninstall(pkg.type, pkg.name, pkg.dir);
  await provider.install(pkg.type, pkg.name, pkg.dir);

  return { type: pkg.type, name: pkg.name, from: manifest.version, to: latest.version, updated: true };
}

/** Core: updates every installed package that has a newer version published. */
export async function updateAllPackages(provider: MarketplaceProvider, cwd: string): Promise<UpdateResult[]> {
  const installed = await getInstalledPackages(provider, cwd);
  const outdated = installed.filter((pkg) => pkg.updateAvailable);

  const results: UpdateResult[] = [];
  for (const pkg of outdated) {
    results.push(await updatePackage(provider, cwd, pkg.name, pkg.type));
  }

  return results;
}

function printInstalledList(packages: InstalledPackageInfo[]): void {
  if (packages.length === 0) {
    console.log(chalk.yellow("⚠️ No packages installed."));
    return;
  }

  packages
    .slice()
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
    .forEach((pkg, index) => {
      const versionInfo = pkg.updateAvailable
        ? chalk.yellow(`${pkg.installedVersion} → ${pkg.latestVersion}`)
        : chalk.gray(`${pkg.installedVersion} (up to date)`);

      console.log(`${index + 1}. [${pkg.type}] ${chalk.bold(pkg.name)} — ${versionInfo}`);
    });
}

/**
 * `ai update [name] [--type T] [--all] [--json]`
 * - name 생략, --all 없음: 설치된 패키지 + 버전 비교 목록 표시(list mode).
 * - name 지정: 그 패키지 하나를 최신 버전으로 갱신.
 * - --all: 업데이트 가능한 설치된 패키지를 전부 갱신.
 */
export async function updateCommand(name?: string, options: UpdateOptions = {}): Promise<void> {
  let type: PackageType | undefined;

  if (options.type) {
    if (!isPackageType(options.type)) {
      console.log(chalk.red(`❌ Invalid --type "${options.type}". Use agent, workflow, or skill.`));
      process.exit(1);
    }
    type = options.type;
  }

  const provider = getMarketplaceProvider();
  const cwd = process.cwd();

  if (!options.json && !name && !options.all) {
    console.log(chalk.cyan("\n⬆️ AI Business OS Update"));
    console.log(chalk.gray("--------------------------------"));
  }

  try {
    if (options.all) {
      const results = await updateAllPackages(provider, cwd);

      if (options.json) {
        console.log(JSON.stringify({ success: true, results }));
        return;
      }

      if (results.length === 0) {
        console.log(chalk.green("✅ Everything is already up to date."));
        return;
      }

      results.forEach((r) => console.log(chalk.green(`✅ ${r.name} (${r.type}): ${r.from} → ${r.to}`)));
      return;
    }

    if (!name) {
      const installed = await getInstalledPackages(provider, cwd);

      if (options.json) {
        console.log(JSON.stringify({ success: true, installed }));
        return;
      }

      printInstalledList(installed);
      return;
    }

    const result = await updatePackage(provider, cwd, name, type);

    if (options.json) {
      console.log(JSON.stringify({ success: true, ...result }));
      return;
    }

    if (!result.updated) {
      console.log(chalk.green(`✅ "${result.name}" is already up to date (v${result.from}).`));
      return;
    }

    console.log(chalk.green("✅ Package updated successfully."));
    console.log(chalk.gray(`📦 ${result.name} (${result.type}): ${result.from} → ${result.to}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof MarketplaceError ? error.code : undefined;

    if (options.json) {
      console.log(JSON.stringify({ success: false, code, error: message }));
      process.exit(1);
    }

    console.log(chalk.red("❌ Update failed."));
    console.error(chalk.red(message));
    process.exit(1);
  }
}
