import fs from "node:fs";
import path from "node:path";
import { log } from "../lib/log.js";
import { detectCurrentProject } from "../lib/currentProject.js";
import { upsertProject } from "../lib/projects.js";

// 대화형 프롬프트 없이 지정된 경로(--path, 없으면 cwd)를 프로젝트
// 레지스트리에 즉시 등록/갱신한다. `scripts/setup.ps1`이 CLI 설치 직후
// 이 저장소 자신을 자동 등록할 때 호출한다(첫 실행 경험 개선 — 새 컴퓨터에서
// `ai` 실행 시 등록된 프로젝트가 하나도 없어 아무것도 찾지 못하던 문제 해결).
async function registerProject(args) {
  const targetPath = path.resolve(args.path || process.cwd());

  if (!fs.existsSync(targetPath)) {
    log.error("프로젝트 등록", `경로를 찾을 수 없습니다: ${targetPath}`);
    process.exitCode = 1;
    return;
  }

  const detected = detectCurrentProject(targetPath);
  const project = upsertProject(detected);

  log.ok("프로젝트 등록", `${project.name} (${project.workspacePath})`);
}

export { registerProject };
