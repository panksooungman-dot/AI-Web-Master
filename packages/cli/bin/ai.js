#!/usr/bin/env node

const { doctor } = require("../src/commands/doctor");
const { newProject } = require("../src/commands/new");
const { devmode } = require("../src/commands/devmode");
const { deploy } = require("../src/commands/deploy");
const { menu } = require("../src/commands/menu");
const { project } = require("../src/commands/project");
const { registerProject } = require("../src/commands/register");

const CLI_VERSION = require("../package.json").version;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function printHelp() {
  console.log(`AI Business OS CLI  v${CLI_VERSION}`);
  console.log("");
  console.log("사용법: ai <command> [옵션]");
  console.log("");
  console.log("  ai           메뉴 실행 (번호로 모든 기능 선택)");
  console.log("  ai menu      메뉴 실행 (위와 동일)");
  console.log("  ai project   프로젝트 런처 — 최근 프로젝트 선택 시 cd 없이 자동 이동,");
  console.log("               Repo(브랜치) 표시, 필요하면 VS Code + dev 서버까지 실행");
  console.log("  ai new       새 프로젝트 생성");
  console.log("  ai devmode   VS Code + npm run dev + 실시간 미리보기 + Visual Editor 실행");
  console.log("               옵션: --name <이름> | --path <경로>");
  console.log("  ai deploy    현재(또는 --path) 프로젝트를 main 브랜치로 push");
  console.log("  ai doctor    개발 환경 점검");
  console.log("  ai register  경로를 프로젝트 레지스트리에 등록 (--path, setup.ps1이 자동 호출)");
  console.log("");
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const args = parseArgs(rest);

  switch (command) {
    case "new":
      await newProject(args);
      break;
    case "devmode":
      await devmode(args);
      break;
    case "deploy":
      await deploy(args);
      break;
    case "doctor":
      doctor();
      break;
    case "menu":
    case undefined:
      await menu();
      break;
    case "project":
      await project(args);
      break;
    case "register":
      await registerProject(args);
      break;
    case "-h":
    case "--help":
    case "help":
      printHelp();
      break;
    case "-v":
    case "--version":
    case "version":
      // 설치된 CLI가 최신 코드인지 빠르게 대조하기 위한 용도(예: 새 컴퓨터에서
      // 설치 후 이 값이 예상보다 낮으면 재설치/재클론이 필요하다는 신호).
      console.log(CLI_VERSION);
      break;
    default:
      printHelp();
      console.log(`알 수 없는 명령: ${command}`);
      process.exitCode = 1;
  }
}

main();
