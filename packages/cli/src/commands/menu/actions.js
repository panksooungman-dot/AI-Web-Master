const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { log } = require("../../lib/log");
const { ask } = require("../../lib/prompt");
const { openInSystem } = require("../../lib/system");
const { commandExists } = require("../../lib/tools");
const { isGitRepo, getStatusSummary, run } = require("../../lib/git");
const { findProjectFile } = require("../../lib/paths");
const { CONFIG_DIR } = require("../../lib/config");
const { listProjects } = require("../../lib/projects");
const { doctor } = require("../doctor");
const { devmode } = require("../devmode");
const { newProject } = require("../new");

const UI_EXPLORER_URL = "http://localhost:3000/developer/ui-explorer";
const CHATGPT_URL = "https://chat.openai.com/";

// ------------------------------------------------------------
// 메뉴 액션 핸들러 — 각 함수는 src/config/menu.json의 "action" 값과
// 이름이 일치해야 한다(예: "action": "devStart" → 아래 devStart()).
// 새 메뉴 항목이 완전히 새로운 동작을 필요로 할 때만 여기에 함수를
// 추가하고 module.exports에 등록한 뒤 menu.json에 action 이름을
// 연결하면 된다. 이미 있는 동작을 재사용하거나 단순 셸 명령이면
// menu.json만 수정해도 충분하다(type: "shell" 항목 참고,
// src/commands/menu/index.js 참고).
//
// gitSync()·saveUpload()는 menu.json이 직접 참조하는 최상위 action이
// 아니다(gitManage() 하위 옵션으로 재배치됨) — 하지만 기존 동작은
// 그대로 남겨 아래에서 재사용한다.
// ------------------------------------------------------------

function install() {
  log.title("AI Business OS - 설치 / 업데이트");

  const setupScript = findProjectFile(path.join("scripts", "setup.ps1"));
  if (!setupScript) {
    log.error("설치 / 업데이트", "scripts/setup.ps1을 찾을 수 없습니다.");
    log.dim("  이 기능은 ai-web-master 저장소 안에서만 사용할 수 있습니다.");
    return;
  }

  console.log("");
  log.info(`[setup] ${setupScript} 실행 중...`);
  console.log("");
  // stdio: "inherit"로 setup.ps1 자신의 진행 상황(단계별 ✔/✘ 출력)이
  // 그대로 화면에 실시간으로 표시된다. 완료 후에는 setup.ps1이 반영하는
  // 종료 코드(status)로 전체 설치 성공/실패를 다시 한번 명확히 알려준다.
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", setupScript], {
    stdio: "inherit",
  });

  console.log("");
  if (result.error) {
    log.error("설치 / 업데이트", `powershell 실행 실패: ${result.error.message}`);
  } else if (result.status === 0) {
    log.ok("설치 / 업데이트", "완료되었습니다.");
  } else {
    log.error("설치 / 업데이트", `설치가 완료되지 않았습니다 (종료 코드: ${result.status}). 위 출력을 참고해 원인을 확인하세요.`);
  }
}

async function devStart() {
  // 메뉴 진입 시 이미 프로젝트 선택(projectSelect.js)이 끝나 process.cwd()가
  // 선택된 프로젝트 경로로 이동해 있다. path를 명시해 devmode가 프로젝트
  // 선택을 다시 묻지 않고 그 경로에서 곧바로 실행되도록 한다.
  await devmode({ path: process.cwd() });
}

async function projectManage() {
  log.title("AI Business OS - 프로젝트 관리");

  const projects = listProjects();
  console.log("");
  if (projects.length === 0) {
    console.log("  등록된 프로젝트가 없습니다.");
  } else {
    console.log("  등록된 프로젝트");
    projects.forEach((p, i) => {
      console.log(`    ${i + 1}) ${p.name.padEnd(28)} (${(p.company || "-").padEnd(10)}) ${p.workspacePath}`);
    });
  }
  console.log("");
  console.log("  1. 새 프로젝트 등록");
  console.log("  0. 메뉴로 돌아가기");
  console.log("");

  const choice = await ask("선택: ");
  if (choice === "1") {
    await newProject({});
  }
}

function healthCheck() {
  doctor();
}

function uiExplorer() {
  log.title("AI Business OS - UI Explorer");

  openInSystem(UI_EXPLORER_URL);
  log.ok("UI Explorer", `열림 (${UI_EXPLORER_URL})`);
  log.dim("  개발 서버(npm run dev)가 실행 중이어야 정상적으로 열립니다.");
}

function claude() {
  log.title("AI Business OS - Claude Code");

  if (!commandExists("claude")) {
    log.error("Claude Code", "claude 명령을 찾을 수 없습니다.");
    log.dim("  해결 : https://claude.com/claude-code 설치 후 PATH를 확인하세요");
    return;
  }

  console.log("");
  log.info(`[claude] ${process.cwd()} 에서 실행합니다...`);
  console.log("");

  const isWin = process.platform === "win32";
  spawnSync(isWin ? "claude.cmd" : "claude", [], { cwd: process.cwd(), stdio: "inherit", shell: isWin });
}

function chatgpt() {
  log.title("AI Business OS - ChatGPT");

  openInSystem(CHATGPT_URL);
  log.ok("ChatGPT", `열림 (${CHATGPT_URL})`);
}

function showGitStatus() {
  const cwd = process.cwd();
  if (!isGitRepo(cwd)) {
    log.error("Git 상태", `Git 저장소가 아닙니다: ${cwd}`);
    return;
  }

  const status = getStatusSummary(cwd);
  console.log("");
  console.log(`  Branch : ${status.branch}`);
  console.log(`  Ahead  : ${status.ahead}`);
  console.log(`  Behind : ${status.behind}`);
  console.log(status.changed > 0 ? `  Status : ${status.changed}건 변경` : "  Status : clean");
}

async function gitSync() {
  log.title("AI Business OS - Git 동기화");

  const cwd = process.cwd();
  if (!isGitRepo(cwd)) {
    log.error("Git 동기화", `Git 저장소가 아닙니다: ${cwd}`);
    return;
  }

  const before = getStatusSummary(cwd);
  console.log("");
  console.log(`  Branch : ${before.branch}`);
  if (before.behind > 0) console.log(`  Behind : ${before.behind}`);
  console.log("");

  log.info("[git] pull 실행 중...");
  const pull = run(cwd, ["pull"]);
  if (pull.ok) {
    log.ok("Git 동기화", "pull 완료");
    if (pull.stdout) log.dim(`  ${pull.stdout}`);
  } else {
    log.error("Git 동기화", pull.stderr || "pull 실패");
  }
}

async function saveUpload() {
  log.title("AI Business OS - 저장 및 업로드");

  const cwd = process.cwd();
  if (!isGitRepo(cwd)) {
    log.error("저장 및 업로드", `Git 저장소가 아닙니다: ${cwd}`);
    return;
  }

  const status = getStatusSummary(cwd);
  if (status.changed === 0) {
    log.ok("저장 및 업로드", "변경된 파일이 없습니다 (커밋할 내용 없음)");
    return;
  }

  console.log("");
  console.log(`  변경된 파일 : ${status.changed}건`);
  const message = await ask("커밋 메시지를 입력하세요: ");
  if (!message) {
    log.warn("저장 및 업로드", "커밋 메시지가 없어 취소되었습니다.");
    return;
  }

  run(cwd, ["add", "-A"]);
  const commit = run(cwd, ["commit", "-m", message]);
  if (!commit.ok) {
    log.error("Commit", commit.stderr || "커밋 실패");
    return;
  }
  log.ok("Commit", message);

  const confirm = await ask(`${status.branch} 브랜치로 push 할까요? (y/N): `);
  if (confirm.toLowerCase() !== "y") {
    log.dim("[저장 및 업로드] push는 건너뛰었습니다.");
    return;
  }

  const push = run(cwd, ["push", "origin", status.branch]);
  if (push.ok) {
    log.ok("Push", "완료");
  } else {
    log.error("Push", push.stderr || "push 실패");
  }
}

async function gitManage() {
  log.title("AI Business OS - Git 관리");

  console.log("");
  console.log("  1. 상태 확인");
  console.log("  2. 동기화 (pull)");
  console.log("  3. 저장 및 업로드 (commit + push)");
  console.log("  0. 메뉴로 돌아가기");
  console.log("");

  const choice = await ask("선택: ");
  if (choice === "1") {
    showGitStatus();
  } else if (choice === "2") {
    await gitSync();
  } else if (choice === "3") {
    await saveUpload();
  }
}

async function settings() {
  log.title("AI Business OS - 설정");

  console.log("");
  console.log(`  설정 폴더     : ${CONFIG_DIR}`);
  console.log(`  등록된 프로젝트 : ${listProjects().length}건`);
  console.log("");
  console.log("  1. 설정 폴더 열기");
  console.log("  0. 메뉴로 돌아가기");
  console.log("");

  const choice = await ask("선택: ");
  if (choice === "1") {
    openInSystem(CONFIG_DIR);
    log.ok("설정 폴더", `열림 (${CONFIG_DIR})`);
  }
}

module.exports = {
  install,
  devStart,
  projectManage,
  healthCheck,
  uiExplorer,
  claude,
  chatgpt,
  gitManage,
  settings,
};
