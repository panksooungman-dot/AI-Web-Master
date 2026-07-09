const { log, color } = require("../../lib/log");
const { ask } = require("../../lib/prompt");
const { openInSystem } = require("../../lib/system");
const { isGitRepo, getStatusSummary } = require("../../lib/git");
const { devmode } = require("../../commands/devmode");
const { DIVIDER, THIN_DIVIDER } = require("../ui");

function buildUrl(port) {
  return port ? `http://localhost:${port}/developer` : null;
}

function printScreen(devModeContext) {
  const url = buildUrl(devModeContext.port);

  console.log("");
  console.log(color(DIVIDER, "cyan"));
  console.log(`  ${color("🚀 Development OS", "boldCyan")}`);
  console.log(color(DIVIDER, "cyan"));
  console.log(`  ${color("프로젝트", "gray")} : ${devModeContext.project.name}`);
  console.log(`  ${color("경로", "gray")}     : ${devModeContext.workspacePath}`);
  console.log(`  ${color("주소", "gray")}     : ${url ?? "감지 안 됨"}`);
  console.log(color(THIN_DIVIDER, "gray"));
  console.log(`  ${color("1", "boldYellow")}  🌐  브라우저 다시 열기`);
  console.log(`  ${color("2", "boldYellow")}  🔄  Git 상태 새로고침`);
  console.log(`  ${color("0", "boldYellow")}  ↩   메인 메뉴로 돌아가기`);
  console.log(color(THIN_DIVIDER, "gray"));
  console.log("");
}

function refreshGitStatus(workspacePath) {
  console.log("");
  if (!isGitRepo(workspacePath)) {
    log.warn("Git 상태", "Git 저장소가 아닙니다.");
    return;
  }

  const status = getStatusSummary(workspacePath);
  console.log(`  Branch : ${status.branch}`);
  if (status.ahead > 0) console.log(`  Ahead  : ${status.ahead}`);
  if (status.behind > 0) console.log(`  Behind : ${status.behind}`);
  console.log(status.changed > 0 ? `  Status : ${status.changed}건 변경` : "  Status : clean");
}

const state = {
  label: "🚀 Development OS",

  async step(session) {
    // 이 state에 처음 들어올 때만(session.context.devMode가 없을 때만)
    // devmode()를 실행한다 — VS Code·dev 서버·브라우저 실행은 Command
    // Engine/Dev Server Manager를 그대로 재사용하며 이번 리팩터링에서
    // 변경하지 않는다. 이후 같은 state에 머무는 동안(재호출) 다시 실행하지 않는다.
    if (!session.context.devMode) {
      const context = await devmode({ path: process.cwd() });
      if (!context) return "mainMenu";
      session.context.devMode = context;
    }

    const devModeContext = session.context.devMode;

    printScreen(devModeContext);
    const raw = await ask("선택 > ");
    const choice = raw.trim();
    const upper = choice.toUpperCase();

    if (choice === "0" || upper === "Q") {
      session.context.devMode = null;
      return "mainMenu";
    }

    if (choice === "1") {
      const url = buildUrl(devModeContext.port);
      if (url) {
        openInSystem(url);
        log.ok("Development OS", `열림 (${url})`);
      } else {
        log.warn("Development OS", "포트를 감지하지 못해 열 수 없습니다.");
      }
      return "developmentOS";
    }

    if (choice === "2") {
      refreshGitStatus(devModeContext.workspacePath);
      return "developmentOS";
    }

    log.warn("Development OS", `알 수 없는 입력입니다: ${choice} (0/1/2를 입력하세요)`);
    return "developmentOS";
  },
};

module.exports = state;
