const { log } = require("../../lib/log");
const { ask } = require("../../lib/prompt");
const { openInSystem } = require("../../lib/system");
const { CONFIG_DIR } = require("../../lib/config");
const { listProjects } = require("../../lib/projects");

function printScreen() {
  console.log("");
  log.title("AI Business OS - 설정");
  console.log("");
  console.log(`  설정 폴더     : ${CONFIG_DIR}`);
  console.log(`  등록된 프로젝트 : ${listProjects().length}건`);
  console.log("");
  console.log("  1. 설정 폴더 열기");
  console.log("  0. 메인 메뉴로 돌아가기");
  console.log("");
}

const state = {
  label: "⚙ 설정",

  async step() {
    printScreen();
    const choice = await ask("선택: ");

    if (choice === "0") return "mainMenu";

    if (choice === "1") {
      openInSystem(CONFIG_DIR);
      log.ok("설정 폴더", `열림 (${CONFIG_DIR})`);
    }

    return "settings";
  },
};

module.exports = state;
