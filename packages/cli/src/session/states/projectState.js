import { log } from "../../lib/log.js";
import { ask } from "../../lib/prompt.js";
import { listProjects } from "../../lib/projects.js";
import { newProject } from "../../commands/new.js";

function printScreen() {
  const projects = listProjects();

  console.log("");
  log.title("AI Business OS - 프로젝트 관리");
  console.log("");
  if (projects.length === 0) {
    console.log("  등록된 프로젝트가 없습니다.");
  } else {
    console.log("  등록된 프로젝트");
    projects.forEach((p, i) => {
      console.log(`    ${i + 1}) ${p.name.padEnd(28)} (${(p.company || "-").padEnd(10)}) ${p.workspacePath}`);
    });
  }
  console.log("");
  console.log("  1. 새 프로젝트 등록");
  console.log("  0. 메인 메뉴로 돌아가기");
  console.log("");
}

const state = {
  label: "📁 프로젝트 관리",

  async step() {
    printScreen();
    const choice = await ask("선택: ");

    if (choice === "0") return "mainMenu";

    if (choice === "1") {
      await newProject({});
    }

    return "project";
  },
};

export default state;
