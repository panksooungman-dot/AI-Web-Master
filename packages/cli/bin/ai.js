#!/usr/bin/env node

const fs = require("node:fs");
const { doctor } = require("../src/commands/doctor");
const { newProject } = require("../src/commands/new");
const { devmode } = require("../src/commands/devmode");
const { deploy } = require("../src/commands/deploy");
const { menu } = require("../src/commands/menu");
const { project } = require("../src/commands/project");
const { registerProject } = require("../src/commands/register");

const { commit: BUILD_COMMIT } = require("../src/buildInfo");
const CLI_VERSION = require("../package.json").version + (BUILD_COMMIT ? `+${BUILD_COMMIT}` : "");

// shell/ai-function.ps1(PowerShell 함수 Wrapper)이 이 프로세스를 실행하기
// 전에 AI_PWSH_CWD_FILE 환경변수로 임시 파일 경로를 넘겨준다. 그 값이
// 있으면, 이 프로세스가 어떤 방식으로 종료되든(process.exit() 포함) 정확히
// "이 순간의 자기 자신의 작업 디렉터리"(menu()/pickProject()가 이미
// chdir해 둔 값)를 그 파일에 적어 놓는다. Wrapper 함수는 이 값을 읽어
// 자신의(=사용자가 보는 PowerShell 세션의) 위치를 Set-Location으로
// 옮긴다 — 자식 프로세스는 부모 셸의 cwd를 직접 바꿀 수 없으므로, 이 값을
// "넘겨주는" 것이 유일한 방법이다. 이 환경변수가 없으면(예: ai.cmd를
// 직접 실행하거나 PowerShell 함수 없이 쓰는 경우) 아무 동작도 하지 않는다.
const cwdExportFile = process.env.AI_PWSH_CWD_FILE;
if (cwdExportFile) {
  process.on("exit", () => {
    try {
      fs.writeFileSync(cwdExportFile, process.cwd(), "utf-8");
    } catch {
      // 실패해도 CLI 자체 동작에는 영향 없음 — Wrapper가 파일을 못 찾으면 이동을 건너뛸 뿐이다.
    }
  });
}

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
