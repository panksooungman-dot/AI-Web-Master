const { log, color } = require("../../lib/log");
const { ask } = require("../../lib/prompt");
const { openInSystem } = require("../../lib/system");
const { isGitRepo, getStatusSummary } = require("../../lib/git");
const { devmode } = require("../../commands/devmode");
const { getRunningDevServer, probeUrl } = require("../../lib/devServer");
const { DIVIDER, THIN_DIVIDER } = require("../ui");

function buildUrl(port) {
  return port ? `http://localhost:${port}/developer` : null;
}

// devModeContext.port는 devmode() 진입 시점에 한 번 감지된 값이라, 이후
// 서버가 재시작되거나(다른 포트로) devmode()의 감지 자체가 다른 인스턴스를
// 잡았던 경우 실제 Running 상태와 어긋날 수 있다. Development OS 카드가
// 읽는 것과 동일한 공유 상태 파일(lib/data/devservers.json)에서 현재
// 실제 Running 포트를 다시 조회해, 포트를 추측/재감지하지 않고 그 값을
// 우선 사용한다(공유 파일에 값이 없으면 devmode() 감지값으로 폴백).
function resolveCurrentPort(devModeContext) {
  const running = getRunningDevServer(devModeContext.workspacePath);
  return running?.port ?? devModeContext.port;
}

function printScreen(devModeContext) {
  const url = buildUrl(resolveCurrentPort(devModeContext));

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
      const url = buildUrl(resolveCurrentPort(devModeContext));
      log.dim(`[Development OS] 열려는 URL: ${url ?? "(포트 미감지)"}`);

      if (!url) {
        log.warn("Development OS", "포트를 감지하지 못해 열 수 없습니다.");
        return "developmentOS";
      }

      // PID가 살아있다는 것만으로는 실제로 이 URL이 응답하는지 보장하지
      // 못한다(예: pid가 재사용됐거나 상태 파일이 아직 갱신 전인 경우).
      // 열기 전에 실제 HTTP 요청으로 Running임을 확인하고, 응답이 없으면
      // 죽은 URL을 그대로 여는 대신 Stopped로 보고한다.
      const probe = await probeUrl(url);
      if (!probe.reachable) {
        log.warn(
          "Development OS",
          `Dev 서버가 응답하지 않습니다 (Stopped로 보입니다) - ${url} (${probe.error})`
        );
        return "developmentOS";
      }

      openInSystem(url);
      log.ok("Development OS", `열림 (${url})`);
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
