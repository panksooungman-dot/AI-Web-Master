import { log } from "../lib/log.js";
import { ask } from "../lib/prompt.js";
import { pickProject } from "../lib/projectPicker.js";
import { getStatusSummary } from "../lib/git.js";
import { devmode } from "./devmode.js";

// AI Business OS 프로젝트 런처 — `ai project`
// 최근 프로젝트 목록에서 선택하면 cd 없이 그 프로젝트 폴더로 자동
// 이동하고(process.chdir), Repo 표시(Git 브랜치·상태)를 곧바로 보여준
// 뒤 필요하면 VS Code + dev 서버까지 이어서 실행한다(devmode 재사용).
// 레지스트리는 사용자 홈 기준 전역 설정(lib/config.js)이라 새 컴퓨터에서도
// 동일하게 동작한다.
async function project(args) {
  log.title("AI Business OS - 프로젝트 런처");

  const selected = await pickProject();
  const workspacePath = selected.workspacePath;

  console.log("");
  console.log(`  프로젝트 : ${selected.name}`);
  console.log(`  경로     : ${workspacePath}`);

  const gitStatus = getStatusSummary(workspacePath);
  if (gitStatus.branch) {
    const changeText = gitStatus.changed > 0 ? `${gitStatus.changed}건 변경` : "clean";
    console.log(`  Repo     : ${gitStatus.branch} (${changeText})`);
  } else {
    console.log("  Repo     : Git 저장소 아님");
  }
  console.log("");

  const answer = await ask("VS Code와 dev 서버를 실행할까요? (Y/n): ");
  if (answer.toLowerCase() === "n") {
    log.dim("[project] VS Code / dev 서버 실행은 건너뛰었습니다.");
    return;
  }

  await devmode({ ...args, path: workspacePath });
}

export { project };
