import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// 특정 저장소(ai-web-master 등)에 종속되지 않는, 사용자 홈 디렉터리 기준
// 전역 설정 위치. 어느 컴퓨터·어느 프로젝트에서 ai를 실행해도 동일하다.
const CONFIG_DIR = path.join(os.homedir(), ".ai-business-os");
const PROJECTS_FILE = path.join(CONFIG_DIR, "projects.json");

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export { CONFIG_DIR, PROJECTS_FILE, ensureConfigDir };
