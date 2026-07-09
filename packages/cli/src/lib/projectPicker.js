const fs = require("node:fs");
const { log, color } = require("./log");
const { ask } = require("./prompt");
const { detectCurrentProject } = require("./currentProject");
const { getRecentProjects, upsertProject, touchProject, normalizePath } = require("./projects");

// "프로젝트 자동 인식 + 최근 목록 선택 + 이동" 핵심 로직. `ai project`(런처)와
// `ai`/`ai menu`(대화형 메뉴 진입 시)가 공유한다.
//   1) 현재 폴더 자동 인식 — package.json/Git 저장소면 프로젝트로 판단
//   2) 최근 프로젝트 목록 저장 — 인식된 프로젝트를 레지스트리에 등록/최근사용시각 갱신
//   3) 최근 프로젝트 목록을 보여주고 번호로 선택받음
//   4) 선택한 프로젝트 경로로 process.chdir() — 이후 실행되는 모든 하위
//      명령(Git 상태 조회, VS Code, dev 서버 등)이 자동으로 그 경로를 대상으로 함
// 호출부(메뉴 배너, 런처 출력)는 매번 process.cwd()를 다시 읽으므로
// chdir 이후 Repo 표시가 자동으로 갱신된다.
async function pickProject() {
  const cwd = process.cwd();
  const current = detectCurrentProject(cwd);

  if (current.isProject) {
    upsertProject(current);
  }

  const recent = getRecentProjects(8);

  // 선택할 것이 없으면(레지스트리가 비어있고 현재 폴더도 프로젝트가 아님)
  // 프롬프트 없이 바로 현재 폴더로 진행한다.
  if (recent.length === 0) {
    return current;
  }

  // 등록된 프로젝트가 정확히 하나뿐이면 선택 프롬프트 없이 곧바로 그
  // 프로젝트를 사용한다 — 새 컴퓨터에 설치 직후(등록된 프로젝트가 1개뿐인
  // 첫 실행 상황)에도 사용자가 매번 Enter/번호를 입력할 필요가 없도록 한다.
  if (recent.length === 1) {
    const only = recent[0];
    if (normalizePath(only.workspacePath) !== normalizePath(cwd)) {
      if (!fs.existsSync(only.workspacePath)) {
        log.error("프로젝트 자동 열기", `경로를 찾을 수 없습니다: ${only.workspacePath}`);
        return current;
      }
      process.chdir(only.workspacePath);
      log.ok("프로젝트 자동 열기", `${only.name} (${only.workspacePath})`);
    }
    touchProject(only.id);
    return only;
  }

  console.log("");
  console.log("  최근 프로젝트");
  recent.forEach((p, i) => {
    const isHere = normalizePath(p.workspacePath) === normalizePath(cwd);
    const mark = isHere ? color("  ← 현재 폴더", "gray") : "";
    console.log(`    ${i + 1}) ${p.name.padEnd(28)} ${p.workspacePath}${mark}`);
  });
  console.log("");

  const choice = await ask("프로젝트 번호를 선택하세요 (Enter = 현재 폴더 사용): ");
  if (!choice) return current;

  const index = Number(choice);
  if (!Number.isInteger(index) || index < 1 || index > recent.length) {
    log.warn("프로젝트 선택", "잘못된 선택입니다. 현재 폴더를 사용합니다.");
    return current;
  }

  const selected = recent[index - 1];
  if (!fs.existsSync(selected.workspacePath)) {
    log.error("프로젝트 선택", `경로를 찾을 수 없습니다: ${selected.workspacePath}`);
    log.dim("  현재 폴더를 사용합니다.");
    return current;
  }

  if (normalizePath(selected.workspacePath) !== normalizePath(cwd)) {
    process.chdir(selected.workspacePath);
    touchProject(selected.id);
    log.ok("프로젝트 선택", `${selected.name} (${selected.workspacePath})`);
  }

  return selected;
}

module.exports = { pickProject };
