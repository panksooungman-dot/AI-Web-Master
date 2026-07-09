const fs = require("node:fs");
const { log, color } = require("../../lib/log");
const { ask } = require("../../lib/prompt");
const { detectCurrentProject } = require("../../lib/currentProject");
const { getRecentProjects, upsertProject, touchProject, normalizePath } = require("../../lib/projects");

// `ai` 실행 시 한 번 호출된다. 이번 세션에서 어떤 프로젝트를 대상으로
// 메뉴 기능을 실행할지 결정한다.
//   1) 현재 폴더 자동 인식 — package.json/Git 저장소면 프로젝트로 판단
//   2) 최근 프로젝트 목록 저장 — 인식된 프로젝트를 레지스트리에 등록/최근사용시각 갱신
//   3) ai 실행 시 프로젝트 선택 — 최근 프로젝트 목록을 보여주고 번호로 선택받음
//   4) 선택한 프로젝트에서 자동 실행 — 선택한 경로로 process.chdir() 하여
//      이후 메뉴의 모든 기능(Git 상태, 개발 시작 등)이 그 경로를 대상으로 동작
//   5) Repo 표시 자동 변경 — 메뉴 상단 배너는 매 루프마다 process.cwd()를
//      다시 읽으므로, chdir 이후 자동으로 선택된 프로젝트가 표시됨
async function selectSessionProject() {
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

  console.log("");
  log.title("AI Business OS - 프로젝트 선택");
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

module.exports = { selectSessionProject };
