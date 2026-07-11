import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { findProjectRoot } from "../utils/config.js";

export async function installCommand(packageName: string): Promise<void> {
  if (!packageName) {
    console.log(chalk.red("❌ Package name is required."));
    console.log(chalk.yellow("Usage: ai install <package>"));
    process.exit(1);
  }

  const projectRoot = await findProjectRoot();

  const marketplaceDir = path.join(projectRoot, "marketplace");
  const sourceDir = path.join(marketplaceDir, packageName);

  const packagesDir = path.join(projectRoot, "packages");
  const targetDir = path.join(packagesDir, packageName);

  console.log(chalk.cyan("\n📦 AI Business OS Installer"));
  console.log(chalk.gray("--------------------------------"));

  try {
    await fs.ensureDir(packagesDir);

    if (!(await fs.pathExists(sourceDir))) {
      console.log(
        chalk.red(`❌ Package "${packageName}" was not found in Marketplace.`)
      );
      process.exit(1);
    }

    if (await fs.pathExists(targetDir)) {
      console.log(
        chalk.yellow(`⚠️ Package "${packageName}" is already installed.`)
      );
      return;
    }

    await fs.copy(sourceDir, targetDir);

    console.log(chalk.green("✅ Package installed successfully."));
    console.log(chalk.gray(`📦 ${packageName}`));
    console.log(chalk.gray(`📁 ${targetDir}`));
  } catch (error) {
    console.error(chalk.red("❌ Installation failed."));
    console.error(error);
    process.exit(1);
  }
}