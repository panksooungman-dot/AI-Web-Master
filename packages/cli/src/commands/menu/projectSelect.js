const { log } = require("../../lib/log");
const { pickProject } = require("../../lib/projectPicker");

// `ai`/`ai menu` 대화형 메뉴 진입 시 한 번 호출된다. 핵심 로직은
// lib/projectPicker.js(pickProject)를 `ai project` 런처와 공유한다.
// 선택 이후 메뉴 상단 배너(프로젝트/경로)는 매 루프마다 process.cwd()를
// 다시 읽으므로 자동으로 반영된다(Repo 표시 자동 변경).
async function selectSessionProject() {
  console.log("");
  log.title("AI Business OS - 프로젝트 선택");
  return pickProject();
}

module.exports = { selectSessionProject };
