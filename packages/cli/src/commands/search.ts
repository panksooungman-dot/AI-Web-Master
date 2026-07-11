import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export async function searchCommand(keyword: string): Promise<void> {
  if (!keyword) {
    console.log(chalk.red("❌ Search keyword is required."));
    console.log(chalk.yellow("Usage: ai search <keyword>"));
    process.exit(1);
  }

  console.log(chalk.cyan("\n🔍 AI Business OS Search"));
  console.log(chalk.gray("--------------------------------"));

  const packagesDir = path.join(process.cwd(), "packages");

  if (!(await fs.pathExists(packagesDir))) {
    console.log(chalk.red("❌ Packages directory not found."));
    process.exit(1);
  }

  const categories = await fs.readdir(packagesDir);
  const results: string[] = [];

  for (const category of categories) {
    const categoryPath = path.join(packagesDir, category);

    const stat = await fs.stat(categoryPath);

    if (!stat.isDirectory()) continue;

    const items = await fs.readdir(categoryPath);

    for (const item of items) {
      if (item.toLowerCase().includes(keyword.toLowerCase())) {
        results.push(`${category}/${item}`);
      }
    }
  }

  if (results.length === 0) {
    console.log(chalk.yellow(`⚠️ No packages found for "${keyword}".`));
    return;
  }

  console.log(chalk.green(`✅ Found ${results.length} package(s):\n`));

  results.forEach((pkg, index) => {
    console.log(`${index + 1}. ${pkg}`);
  });

  console.log(chalk.gray("\n--------------------------------"));
  console.log(chalk.green("Search completed.\n"));
}