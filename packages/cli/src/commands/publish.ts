import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export async function publishCommand(packageName: string): Promise<void> {
  if (!packageName) {
    console.log(chalk.red("❌ Package name is required."));
    console.log(chalk.yellow("Usage: ai publish <package>"));
    process.exit(1);
  }

  console.log(chalk.cyan("\n🚀 AI Business OS Publisher"));
  console.log(chalk.gray("--------------------------------"));

  const projectRoot = process.cwd();

  const packagesDir = path.join(projectRoot, "packages");
  const sourceDir = path.join(packagesDir, packageName);

  const marketplaceDir = path.join(projectRoot, "marketplace");
  const targetDir = path.join(marketplaceDir, packageName);

  try {
    if (!(await fs.pathExists(sourceDir))) {
      console.log(
        chalk.red(`❌ Package "${packageName}" does not exist.`)
      );
      process.exit(1);
    }

    await fs.ensureDir(marketplaceDir);

    if (await fs.pathExists(targetDir)) {
      console.log(
        chalk.yellow(`⚠️ Package "${packageName}" already exists in Marketplace.`)
      );
      console.log(chalk.yellow("Updating existing package..."));

      await fs.remove(targetDir);
    }

    await fs.copy(sourceDir, targetDir);

    console.log(chalk.green("✅ Package published successfully."));
    console.log(chalk.gray(`📦 ${packageName}`));
    console.log(chalk.gray(`📁 ${targetDir}`));
  } catch (error) {
    console.error(chalk.red("❌ Publish failed."));
    console.error(error);
    process.exit(1);
  }
}