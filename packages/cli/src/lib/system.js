const { spawn } = require("node:child_process");

// URL이든 폴더 경로든 OS 기본 프로그램(브라우저·탐색기)으로 연다.
// Windows의 `start`, macOS의 `open`, Linux의 `xdg-open`은 대상이 URL이든
// 파일/폴더 경로든 동일하게 동작하므로 하나의 함수로 공용 처리한다.
function openInSystem(target) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", target], { stdio: "ignore", detached: true }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [target], { stdio: "ignore", detached: true }).unref();
  } else {
    spawn("xdg-open", [target], { stdio: "ignore", detached: true }).unref();
  }
}

module.exports = { openInSystem };
