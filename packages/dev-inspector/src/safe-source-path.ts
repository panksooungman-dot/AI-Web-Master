import fs from "node:fs";
import path from "node:path";

/**
 * 개발자 모드 인라인 편집(dev-inspector)이 쓰기 가능한 소스 파일 범위를 제한한다.
 * - 프로젝트 루트(process.cwd()) 바깥 경로 금지 (경로 탈출 방지)
 * - components/ 또는 app/ 하위만 허용
 * - .tsx / .jsx 확장자만 허용
 * - 실제로 존재하는 파일만 허용
 *
 * process.cwd()를 기준으로 판단하므로, 이 패키지를 사용하는 프로젝트의
 * Next.js 서버가 실행되는 위치가 곧 대상 프로젝트 루트가 된다.
 */

const ALLOWED_TOP_LEVEL_DIRS = ["components", "app"];
const ALLOWED_EXTENSIONS = [".tsx", ".jsx"];

export function resolveSafeSourcePath(relativeFile: string): string | null {
  if (!relativeFile || relativeFile.includes("..")) return null;

  const normalized = relativeFile.replace(/\\/g, "/").replace(/^\/+/, "");
  const topDir = normalized.split("/")[0];
  const ext = path.extname(normalized);

  if (!ALLOWED_TOP_LEVEL_DIRS.includes(topDir) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return null;
  }

  const root = process.cwd();
  const absolute = path.resolve(root, normalized);

  if (absolute !== root && !absolute.startsWith(root + path.sep)) return null;
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null;

  return absolute;
}
