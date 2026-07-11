import { spawnSync } from "node:child_process";

const isWin = process.platform === "win32";

function commandExists(cmd) {
  const checker = isWin ? "where" : "which";
  const result = spawnSync(checker, [cmd], { encoding: "utf-8" });
  return result.status === 0;
}

function getVersion(cmd, args = ["--version"]) {
  // Windows에서 code/claude/npm 등은 .cmd 셸 스크립트라 shell 없이는 ENOENT가
  // 날 수 있다. shell:true일 때 args 배열을 그대로 넘기면 인자 이스케이프
  // 관련 Deprecation 경고가 뜨므로, 이 경우엔 하나의 커맨드 문자열로 합친다.
  const result = isWin
    ? spawnSync([cmd, ...args].join(" "), { encoding: "utf-8", shell: true })
    : spawnSync(cmd, args, { encoding: "utf-8" });
  if (result.status !== 0 && !result.stdout) return null;
  return (result.stdout || result.stderr || "").trim().split("\n")[0];
}

export { commandExists, getVersion };
