import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// 현재 작업 디렉터리가 속한 Git 저장소의 루트를 찾는다. 저장소가 아니면 null.
function findRepoRoot(cwd = process.cwd()) {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf-8" });
  if (result.status !== 0 || !result.stdout) return null;
  return result.stdout.trim().split("/").join(path.sep);
}

// 현재 폴더 기준, 그리고 (있다면) 저장소 루트 기준으로 relativePath를 찾는다.
// scripts/setup.ps1처럼 특정 저장소(ai-web-master)에만 존재하는 파일을
// 전역 CLI에서 참조할 때 사용한다 — 없으면 null을 반환해 호출부가 안내
// 메시지를 표시하도록 한다(예외를 던지지 않음).
function findProjectFile(relativePath, cwd = process.cwd()) {
  const direct = path.join(cwd, relativePath);
  if (fs.existsSync(direct)) return direct;

  const repoRoot = findRepoRoot(cwd);
  if (repoRoot) {
    const fromRoot = path.join(repoRoot, relativePath);
    if (fs.existsSync(fromRoot)) return fromRoot;
  }

  return null;
}

export { findRepoRoot, findProjectFile };
