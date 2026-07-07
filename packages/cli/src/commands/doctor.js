const fs = require("node:fs");
const { commandExists, getVersion } = require("../lib/tools");
const { log } = require("../lib/log");
const { CONFIG_DIR } = require("../lib/config");

function doctor() {
  log.title("AI Business OS - Doctor");
  let fail = false;

  console.log("");
  console.log("Development Tools");
  console.log("-----------------");

  const checks = [
    ["Git", "git", ["--version"]],
    ["Node.js", "node", ["-v"]],
    ["npm", "npm", ["-v"]],
    ["VS Code", "code", ["--version"]],
    ["Claude Code", "claude", ["--version"]],
  ];

  for (const [label, cmd, args] of checks) {
    if (commandExists(cmd)) {
      log.ok(label, getVersion(cmd, args) || "");
    } else {
      log.error(label, `${cmd} 명령을 찾을 수 없음`);
      fail = true;
    }
  }

  console.log("");
  console.log("AI Business OS");
  console.log("--------------");

  if (fs.existsSync(CONFIG_DIR)) {
    log.ok("Config", CONFIG_DIR);
  } else {
    log.warn("Config", `${CONFIG_DIR} 없음 (ai new 또는 ai devmode 실행 시 자동 생성됩니다)`);
  }

  log.ok("ai CLI", "이 명령이 실행됐다는 것 자체가 전역 설치가 정상임을 의미합니다");

  console.log("");
  console.log("====================================");
  console.log(fail ? "Overall Status : FAIL" : "Overall Status : PASS");
  console.log("====================================");
  console.log("");
}

module.exports = { doctor };
