import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { findProjectRoot } from "../utils/config.js";

export async function updateCommand(packageName: string): Promise<void> {
  if (!packageName) {
    console.log(chalk.red("❌ Package name is required."));
    console.log(chalk.yellow("Usage: ai update <package>"));
    process.exit(1);
  }

  console.log(chalk.cyan("\n⬆️ AI Business OS Update"));
  console.log(chalk.gray("--------------------------------"));

  const projectRoot = await findProjectRoot();

  const marketplaceDir = path.join(projectRoot, "marketplace");
  const sourceDir = path.join(marketplaceDir, packageName);

  const packagesDir = path.join(projectRoot, "packages");
  const targetDir = path.join(packagesDir, packageName);

  try {
    if (!(await fs.pathExists(targetDir))) {
      console.log(
        chalk.red(`❌ Package "${packageName}" is not installed.`)
      );
      process.exit(1);
    }

    if (!(await fs.pathExists(sourceDir))) {
      console.log(
        chalk.red(`❌ Package "${packageName}" not found in Marketplace.`)
      );
      process.exit(1);
    }

    console.log(chalk.yellow("🔄 Updating package..."));

    await fs.remove(targetDir);
    await fs.copy(sourceDir, targetDir);

    console.log(chalk.green("✅ Package updated successfully."));
    console.log(chalk.gray(`📦 ${packageName}`));
    console.log(chalk.gray(`📁 ${targetDir}`));
  } catch (error) {
    console.error(chalk.red("❌ Update failed."));
    console.error(error);
    process.exit(1);
  }
}