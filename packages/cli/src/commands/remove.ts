import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export async function removeCommand(packageName: string): Promise<void> {
  if (!packageName) {
    console.log(chalk.red("❌ Package name is required."));
    console.log(chalk.yellow("Usage: ai remove <package>"));
    process.exit(1);
  }

  console.log(chalk.cyan("\n🗑 AI Business OS Remove"));
  console.log(chalk.gray("--------------------------------"));

  const packagesDir = path.join(process.cwd(), "packages");
  const packageDir = path.join(packagesDir, packageName);

  try {
    if (!(await fs.pathExists(packageDir))) {
      console.log(
        chalk.red(`❌ Package "${packageName}" is not installed.`)
      );
      process.exit(1);
    }

    await fs.remove(packageDir);

    console.log(chalk.green("✅ Package removed successfully."));
    console.log(chalk.gray(`📦 ${packageName}`));
    console.log(chalk.gray(`📁 ${packageDir}`));
  } catch (error) {
    console.error(chalk.red("❌ Failed to remove package."));
    console.error(error);
    process.exit(1);
  }
}