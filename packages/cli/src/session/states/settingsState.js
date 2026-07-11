import { log } from "../../lib/log.js";
import { ask } from "../../lib/prompt.js";
import { openInSystem } from "../../lib/system.js";
import { CONFIG_DIR } from "../../lib/config.js";
import { listProjects } from "../../lib/projects.js";

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

export default state;
