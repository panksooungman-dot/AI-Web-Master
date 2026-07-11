import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import { findProjectRoot } from "../utils/config.js";

export async function doctorCommand(): Promise<void> {
  console.log(chalk.cyan("\n🩺 AI Business OS Doctor"));
  console.log(chalk.gray("================================"));

  // Node.js
  try {
    const version = execSync("node -v").toString().trim();
    console.log(chalk.green(`✅ Node.js : ${version}`));
  } catch {
    console.log(chalk.red("❌ Node.js not found"));
  }

  // npm
  try {
    const version = execSync("npm -v").toString().trim();
    console.log(chalk.green(`✅ npm     : ${version}`));
  } catch {
    console.log(chalk.red("❌ npm not found"));
  }

  // Git
  try {
    const version = execSync("git --version").toString().trim();
    console.log(chalk.green(`✅ ${version}`));
  } catch {
    console.log(chalk.red("❌ Git not found"));
  }

  console.log(chalk.gray("--------------------------------"));

  // 프로젝트 루트 찾기
  const projectRoot = await findProjectRoot();

  const requiredDirectories = [
    "packages",
    "agents",
    "skills",
    "prompts",
    "templates",
    "workflows",
    "marketplace",
    "memory",
    "orchestration",
    ".github",
  ];

  console.log(chalk.cyan("📂 Project Structure"));

  for (const dir of requiredDirectories) {
    const exists = await fs.pathExists(path.join(projectRoot, dir));

    if (exists) {
      console.log(chalk.green(`✅ ${dir}`));
    } else {
      console.log(chalk.yellow(`⚠️ ${dir} (missing)`));
    }
  }

  console.log(chalk.gray("--------------------------------"));

  const packageJson = path.join(projectRoot, "package.json");

  if (await fs.pathExists(packageJson)) {
    console.log(chalk.green("✅ package.json"));
  } else {
    console.log(chalk.yellow("⚠️ package.json not found"));
  }

  console.log(chalk.gray("--------------------------------"));
  console.log(chalk.green("🎉 AI Business OS Doctor completed.\n"));
}
