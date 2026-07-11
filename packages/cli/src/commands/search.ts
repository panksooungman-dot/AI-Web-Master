import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { findProjectRoot } from "../utils/config.js";

export async function searchCommand(keyword: string): Promise<void> {
  if (!keyword) {
    console.log(chalk.red("❌ Search keyword is required."));
    console.log(chalk.yellow("Usage: ai search <keyword>"));
    process.exit(1);
  }

  console.log(chalk.cyan("\n🔍 AI Business OS Search"));
  console.log(chalk.gray("--------------------------------"));

  // 프로젝트 루트 찾기
  const projectRoot = await findProjectRoot();

  // packages 디렉터리
  const packagesDir = path.join(projectRoot, "packages");

  if (!(await fs.pathExists(packagesDir))) {
    console.log(chalk.red("❌ Packages directory not found."));
    process.exit(1);
  }

  const entries = await fs.readdir(packagesDir);
  const results: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(packagesDir, entry);
    const stat = await fs.stat(entryPath);

    if (!stat.isDirectory()) {
      continue;
    }

    if (entry.toLowerCase().includes(keyword.toLowerCase())) {
      results.push(entry);
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