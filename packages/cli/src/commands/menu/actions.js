import path from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "../../lib/log.js";
import { openInSystem } from "../../lib/system.js";
import { commandExists } from "../../lib/tools.js";
import { findProjectFile } from "../../lib/paths.js";
import { doctorCommand } from "../doctor.js";

const UI_EXPLORER_URL = "http://localhost:3000/developer/ui-map";
const CHATGPT_URL = "https://chat.openai.com/";

// ------------------------------------------------------------
// 1회성(single-shot) 메인 메뉴 액션만 남아 있다. 각 함수는
// src/config/menu.json의 "action" 값과 이름이 일치해야 한다(예:
// "action": "install" → 아래 install()).
//
// 화면 전환이 필요한 항목(개발 시작·프로젝트 관리·Git 관리·설정)은 더 이상
// 여기 없다 — SessionManager의 State로 옮겨졌다(src/session/states/).
// menu.json에서는 "action" 대신 "state"로 선언되어 있고,
// src/session/states/mainMenuState.js가 이를 State 전이로 처리한다.
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

async function healthCheck() {
  await doctorCommand();
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

export { install, healthCheck, uiExplorer, claude, chatgpt };
