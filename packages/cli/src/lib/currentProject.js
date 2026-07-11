import fs from "node:fs";
import path from "node:path";
import { isGitRepo } from "./git.js";

function readPackageName(cwd) {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.name || null;
  } catch {
    // package.json이 깨져있어도 호출부는 계속 동작해야 하므로 무시하고 폴더명으로 대체
    return null;
  }
}

// 현재 폴더가 "프로젝트"로 볼 수 있는지 판별한다: package.json이 있거나
// Git 저장소이면 프로젝트로 간주해 자동으로 프로젝트 레지스트리에 등록한다.
// 그 외(예: 임의의 빈 폴더)에서는 등록하지 않고 조회용으로만 사용한다.
function detectCurrentProject(cwd = process.cwd()) {
  const hasPackageJson = fs.existsSync(path.join(cwd, "package.json"));
  const isProject = hasPackageJson || isGitRepo(cwd);

  return {
    id: null,
    name: readPackageName(cwd) || path.basename(cwd),
    company: "-",
    type: "-",
    description: "",
    workspacePath: cwd,
    status: "-",
    isProject,
  };
}

export { detectCurrentProject };
