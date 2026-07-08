const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { log } = require("../lib/log");
const { ask } = require("../lib/prompt");
const { openInSystem } = require("../lib/system");
const { commandExists } = require("../lib/tools");
const { isGitRepo, getStatusSummary, run } = require("../lib/git");
const { findProjectFile } = require("../lib/paths");
const { CONFIG_DIR } = require("../lib/config");
const { listProjects } = require("../lib/projects");
const { doctor } = require("./doctor");
const { devmode } = require("./devmode");

const UI_EXPLORER_URL = "http://localhost:3000/developer/ui-explorer";

// ------------------------------------------------------------
// 메뉴 항목별 실행 함수 (기능 1개 = 함수 1개, 새 메뉴는 아래에 함수를
// 추가하고 MENU_ITEMS 배열에 한 줄만 더하면 된다)
// ------------------------------------------------------------

async function installOrUpdate() {
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
  spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", setupScript], {
    stdio: "inherit",
  });
}

async function startDev() {
  await devmode({});
}

function checkHealth() {
  doctor();
}

function launchClaude() {
  log.title("AI Business OS - Claude 실행");

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

function openUiExplorer() {
  log.title("AI Business OS - UI Explorer");

  openInSystem(UI_EXPLORER_URL);
  log.ok("UI Explorer", `열림 (${UI_EXPLORER_URL})`);
  log.dim("  개발 서버(npm run dev)가 실행 중이어야 정상적으로 열립니다.");
}

async function syncGit() {
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

async function saveAndUpload() {
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

async function openSettings() {
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

// ------------------------------------------------------------
// 메뉴 정의 — 새 기능을 추가하려면 위에 함수를 만들고 이 배열에
// { key, label, action } 한 줄만 추가하면 된다.
// ------------------------------------------------------------
const MENU_ITEMS = [
  { key: "1", label: "🛠 설치 / 업데이트", action: installOrUpdate },
  { key: "2", label: "🚀 개발 시작", action: startDev },
  { key: "3", label: "❤️ 환경 점검", action: checkHealth },
  { key: "4", label: "🤖 Claude 실행", action: launchClaude },
  { key: "5", label: "🌐 UI Explorer", action: openUiExplorer },
  { key: "6", label: "🔄 Git 동기화", action: syncGit },
  { key: "7", label: "📦 저장 및 업로드", action: saveAndUpload },
  { key: "8", label: "⚙ 설정", action: openSettings },
];

function printMenu() {
  console.log("");
  console.log("🤖 AI Business OS");
  console.log("");
  console.log("==================================");
  for (const item of MENU_ITEMS) {
    console.log(`${item.key}. ${item.label}`);
  }
  console.log("0. 종료");
  console.log("==================================");
  console.log("");
}

async function menu() {
  let running = true;

  while (running) {
    printMenu();
    const choice = await ask("번호를 입력하세요: ");

    if (choice === "0") {
      log.dim("[menu] 종료합니다.");
      break;
    }

    if (!choice) continue;

    const item = MENU_ITEMS.find((m) => m.key === choice);
    if (!item) {
      log.warn("menu", `알 수 없는 번호입니다: ${choice}`);
      continue;
    }

    try {
      await item.action();
    } catch (err) {
      log.error(item.label, err && err.message ? err.message : String(err));
    }

    await ask("\n계속하려면 Enter를 누르세요...");
  }
}

module.exports = { menu, MENU_ITEMS };
