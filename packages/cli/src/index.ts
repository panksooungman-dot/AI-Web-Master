#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { Command } from "commander";

import { initCommand } from "./commands/init.js";
import { buildCreateCommand } from "./commands/create.js";
import { runCommand } from "./commands/run.js";
import { buildWorkflowCommand } from "./commands/workflow.js";
import { buildMemoryCommand } from "./commands/memory.js";
import { buildOrchestratorCommand } from "./commands/orchestrator.js";
import { buildProviderCommand } from "./commands/provider.js";
import { buildToolsCommand } from "./commands/tools.js";
import { buildWebsiteCommand } from "./commands/website.js";
import { addCommand } from "./commands/add.js";
import { installCommand } from "./commands/install.js";
import { doctorCommand } from "./commands/doctor.js";
import { searchCommand } from "./commands/search.js";
import { removeCommand } from "./commands/remove.js";
import { updateCommand } from "./commands/update.js";
import { publishCommand } from "./commands/publish.js";
import { menu as menuCommand } from "./commands/menu/index.js";
import { project as projectCommand } from "./commands/project.js";
import { devmode as devmodeCommand } from "./commands/devmode.js";
import { deploy as deployCommand } from "./commands/deploy.js";
import { registerProject } from "./commands/register.js";
import { commit as BUILD_COMMIT } from "./buildInfo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"));
const CLI_VERSION = pkg.version + (BUILD_COMMIT ? `+${BUILD_COMMIT}` : "");

const program = new Command();

program
  .name("ai")
  .description("AI Business OS Command Line Interface")
  .version(CLI_VERSION);

program
  .command("menu")
  .description("메뉴 실행 (번호로 모든 기능 선택)")
  .action(async () => {
    await menuCommand();
  });

program
  .command("project")
  .description("프로젝트 런처 — 최근 프로젝트 선택 시 자동 이동, VS Code + dev 서버까지 실행")
  .action(async () => {
    await projectCommand({});
  });

program
  .command("devmode")
  .description("VS Code + npm run dev + 실시간 미리보기 + Visual Editor 실행")
  .option("--name <name>", "등록된 프로젝트 이름으로 검색")
  .option("--path <path>", "프로젝트 경로")
  .action(async (options: { name?: string; path?: string }) => {
    await devmodeCommand(options);
  });

program
  .command("deploy")
  .description("현재(또는 --path) 프로젝트를 지정 브랜치로 push")
  .option("--path <path>", "프로젝트 경로")
  .option("--branch <branch>", "대상 브랜치 (기본값: main)")
  .action(async (options: { path?: string; branch?: string }) => {
    await deployCommand(options);
  });

program
  .command("register")
  .description("경로를 프로젝트 레지스트리에 등록")
  .option("--path <path>", "등록할 경로 (기본값: 현재 폴더)")
  .action(async (options: { path?: string }) => {
    await registerProject(options);
  });

program.addCommand(buildCreateCommand());

program
  .command("run")
  .argument("<agent-name>", "Agent name")
  .option("--provider <id>", "LLM provider (anthropic|openai|gemini|ollama). 생략 시 기본 provider 또는 시뮬레이션")
  .description("Agent Runtime 실행 (provider 설정 시 실제 LLM 호출, 없으면 시뮬레이션)")
  .action(async (name: string, options: { provider?: string }) => {
    await runCommand(name, options);
  });

program.addCommand(buildWorkflowCommand());
program.addCommand(buildMemoryCommand());
program.addCommand(buildOrchestratorCommand());
program.addCommand(buildProviderCommand());
program.addCommand(buildToolsCommand());
program.addCommand(buildWebsiteCommand());

program
  .command("init")
  .argument("[project]", "Project name")
  .description("Initialize a new AI Business OS project")
  .action(async (project?: string) => {
    await initCommand(project);
  });

program
  .command("add")
  .argument("<package>", "Package name")
  .description("Add a package")
  .action(async (pkg: string) => {
    await addCommand(pkg);
  });

program
  .command("install")
  .argument("<package>", "Package name")
  .option("--type <type>", "agent | workflow | skill")
  .description("마켓플레이스의 패키지를 현재 프로젝트에 설치")
  .action(async (pkg: string, options: { type?: string }) => {
    await installCommand(pkg, options);
  });

program
  .command("doctor")
  .description("Check the development environment")
  .action(async () => {
    await doctorCommand();
  });

program
  .command("search")
  .argument("[keyword]", "Search keyword (name/description 부분 일치)")
  .option("--type <type>", "agent | workflow | skill")
  .description("마켓플레이스에 게시된 패키지 검색")
  .action(async (keyword: string | undefined, options: { type?: string }) => {
    await searchCommand(keyword, options);
  });

program
  .command("remove")
  .argument("<package>", "Package name")
  .description("Remove an installed package")
  .action(async (pkg: string) => {
    await removeCommand(pkg);
  });

program
  .command("update")
  .argument("<package>", "Package name")
  .description("Update an installed package")
  .action(async (pkg: string) => {
    await updateCommand(pkg);
  });

program
  .command("publish")
  .argument("[package]", "Package name (생략 시 agents/·workflows/·skills/의 모든 로컬 패키지를 게시)")
  .description("생성된 Agent/Workflow/Skill을 마켓플레이스에 게시")
  .action(async (pkg?: string) => {
    await publishCommand(pkg);
  });

async function main(): Promise<void> {
  // 인자 없이 `ai`만 실행하면 대화형 메뉴로 진입한다(기존 bin/ai.js와 동일한 동작).
  if (process.argv.length <= 2) {
    await menuCommand();
    return;
  }

  await program.parseAsync(process.argv);
}

main();