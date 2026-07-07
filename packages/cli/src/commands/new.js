const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { spawnSync } = require("node:child_process");
const { log } = require("../lib/log");
const { addProject } = require("../lib/projects");

function ask(rl, question, defaultValue = "") {
  return new Promise((resolve) => {
    rl.question(defaultValue ? `${question} (${defaultValue}): ` : `${question}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function newProject(args) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  log.title("AI Business OS - New Project");
  console.log("");

  const name = args.name || (await ask(rl, "프로젝트 이름"));
  if (!name) {
    log.error("New", "프로젝트 이름은 필수입니다");
    rl.close();
    return;
  }
  const company = args.company || (await ask(rl, "회사", "-"));
  const type = args.type || (await ask(rl, "유형", "Web Application"));
  const description = args.description || (await ask(rl, "설명", ""));
  const slug = String(name).trim().replace(/\s+/g, "-").toLowerCase();
  const defaultPath = path.join(process.cwd(), slug);
  const targetPath = path.resolve(args.path || (await ask(rl, "생성 위치", defaultPath)));

  rl.close();

  if (fs.existsSync(targetPath) && fs.readdirSync(targetPath).length > 0) {
    log.error("New", `대상 폴더가 비어있지 않습니다: ${targetPath}`);
    return;
  }

  fs.mkdirSync(targetPath, { recursive: true });

  const pkg = {
    name: slug || "new-project",
    version: "0.1.0",
    private: true,
    description,
    scripts: {},
  };
  fs.writeFileSync(path.join(targetPath, "package.json"), JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  fs.writeFileSync(path.join(targetPath, "README.md"), `# ${name}\n\n${description}\n`, "utf-8");
  log.ok("Scaffold", targetPath);

  const gitInit = spawnSync("git", ["init"], { cwd: targetPath, encoding: "utf-8" });
  if (gitInit.status === 0) {
    log.ok("Git", "저장소 초기화 완료");
  } else {
    log.warn("Git", "git init 실패 - 수동으로 초기화하세요");
  }

  const project = addProject({
    id: `project-${Date.now()}`,
    name,
    company,
    type,
    description,
    workspacePath: targetPath.replace(/\\/g, "/"),
    status: "Active",
    createdAt: new Date().toISOString(),
    lastOpenedAt: null,
  });

  log.ok("Registered", `전역 레지스트리에 등록됨 (${project.id})`);
  console.log("");
  log.info(`다음: cd "${targetPath}" && ai devmode`);
  console.log("");
}

module.exports = { newProject };
