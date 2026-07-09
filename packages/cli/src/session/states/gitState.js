const { log } = require("../../lib/log");
const { ask } = require("../../lib/prompt");
const { isGitRepo, getStatusSummary, run } = require("../../lib/git");

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

function printScreen() {
  console.log("");
  log.title("AI Business OS - Git 관리");
  console.log("");
  console.log("  1. 상태 확인");
  console.log("  2. 동기화 (pull)");
  console.log("  3. 저장 및 업로드 (commit + push)");
  console.log("  0. 메인 메뉴로 돌아가기");
  console.log("");
}

const state = {
  label: "🔄 Git 관리",

  async step() {
    printScreen();
    const choice = await ask("선택: ");

    if (choice === "0") return "mainMenu";
    if (choice === "1") showGitStatus();
    else if (choice === "2") await gitSync();
    else if (choice === "3") await saveUpload();

    return "git";
  },
};

module.exports = state;
