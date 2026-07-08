const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { log } = require("../lib/log");
const { listProjects, touchProject } = require("../lib/projects");
const { getStatusSummary } = require("../lib/git");
const { commandExists, getVersion } = require("../lib/tools");
const { startDevServer } = require("../lib/devServer");
const { installDevInspector } = require("../lib/devInspectorInstall");
const { ask } = require("../lib/prompt");
const { openInSystem } = require("../lib/system");

function currentDirProject() {
  return {
    id: null,
    name: path.basename(process.cwd()),
    company: "-",
    type: "-",
    description: "",
    workspacePath: process.cwd(),
    status: "-",
  };
}

async function selectProject(args) {
  if (args.path) {
    const resolved = path.resolve(args.path);
    if (!fs.existsSync(resolved)) {
      log.error("devmode", `경로를 찾을 수 없습니다: ${resolved}`);
      return null;
    }
    return {
      id: null,
      name: path.basename(resolved),
      company: "-",
      type: "-",
      description: "",
      workspacePath: resolved,
      status: "-",
    };
  }

  const projects = listProjects();

  if (args.name) {
    const match = projects.find((p) => p.name.toLowerCase().includes(String(args.name).toLowerCase()));
    if (match) return match;
    log.warn("devmode", `'${args.name}'와 일치하는 프로젝트를 찾지 못했습니다.`);
  }

  if (projects.length === 0) {
    log.dim("[devmode] 등록된 프로젝트가 없습니다 (ai new로 등록 가능). 현재 폴더를 사용합니다.");
    return currentDirProject();
  }

  console.log("");
  console.log("등록된 프로젝트");
  projects.forEach((p, i) => {
    console.log(`  ${i + 1}) ${p.name.padEnd(28)} (${(p.company || "-").padEnd(10)}) ${p.workspacePath}`);
  });
  console.log("");

  const choice = await ask("프로젝트 번호를 선택하세요 (Enter = 현재 폴더): ");
  if (!choice) return currentDirProject();

  const index = Number(choice);
  if (Number.isInteger(index) && index >= 1 && index <= projects.length) {
    return projects[index - 1];
  }

  log.warn("devmode", "잘못된 선택입니다. 현재 폴더를 사용합니다.");
  return currentDirProject();
}

async function devmode(args) {
  log.title("AI Business OS - Dev Mode");

  const project = await selectProject(args);
  if (!project) return;

  const workspacePath = project.workspacePath;
  if (!fs.existsSync(workspacePath)) {
    log.error("devmode", `프로젝트 경로를 찾을 수 없습니다: ${workspacePath}`);
    return;
  }

  console.log("");
  log.info(`선택됨: ${project.name}  ->  ${workspacePath}`);
  console.log("");

  // 0) Visual Editor(@cnbiz/dev-inspector) 자동 연결 — 새 프로젝트에도 코드 복사 없이 적용
  installDevInspector(workspacePath, log);
  console.log("");

  // 1) VS Code 열기
  if (commandExists("code")) {
    if (process.platform === "win32") {
      spawnSync(`code.cmd "${workspacePath}"`, { stdio: "ignore", shell: true });
    } else {
      spawnSync("code", [workspacePath], { stdio: "ignore" });
    }
    log.ok("VS Code", `열림 (${workspacePath})`);
  } else {
    log.error("VS Code", "code 명령을 찾을 수 없음");
    log.dim("   해결 : VS Code Command Palette > 'Shell Command: Install code command in PATH'");
  }

  // 2) npm run dev 실행 + 3) 미리보기 열기 (실제 포트를 출력에서 자동 감지)
  const hasPackageJson = fs.existsSync(path.join(workspacePath, "package.json"));
  if (hasPackageJson) {
    log.info("[devmode] 새 터미널 창에서 'npm run dev'를 시작합니다 (포트 자동 감지 중)...");
    const { port } = await startDevServer(workspacePath);
    if (port) {
      log.ok("Dev Server", `새 터미널 창에서 시작됨 (http://localhost:${port})`);
      openInSystem(`http://localhost:${port}`);
      log.ok("Live Preview", `열림 (http://localhost:${port})`);
    } else {
      log.warn("Dev Server", "포트를 자동으로 감지하지 못했습니다 - 새로 열린 터미널 창을 확인하세요");
    }
  } else {
    log.warn("Dev Server", `package.json이 없어 건너뜁니다 (${workspacePath})`);
  }

  // 4) Git 상태 표시
  console.log("");
  console.log("Git 상태");
  const gitStatus = getStatusSummary(workspacePath);
  if (gitStatus.branch) {
    console.log(`  Branch : ${gitStatus.branch}`);
    if (gitStatus.ahead > 0) console.log(`  Ahead  : ${gitStatus.ahead}`);
    if (gitStatus.behind > 0) console.log(`  Behind : ${gitStatus.behind}`);
    console.log(gitStatus.changed > 0 ? `  Status : ${gitStatus.changed}건 변경` : "  Status : clean");
  } else {
    console.log("  Git 저장소가 아닙니다.");
  }

  // 5) Claude Code 준비
  console.log("");
  console.log("Claude Code");
  if (commandExists("claude")) {
    log.ok("준비됨", getVersion("claude", ["--version"]) || "");
    log.dim(`  실행: cd "${workspacePath}" 후 claude`);
  } else {
    log.error("claude", "명령을 찾을 수 없음");
    log.dim("  해결 : https://claude.com/claude-code 설치 후 PATH를 확인하세요");
  }

  // 6) 프로젝트 정보 표시
  console.log("");
  console.log("프로젝트 정보");
  console.log(`  이름 : ${project.name}`);
  console.log(`  회사 : ${project.company}`);
  console.log(`  유형 : ${project.type}`);
  if (project.description) console.log(`  설명 : ${project.description}`);
  console.log(`  경로 : ${workspacePath}`);
  console.log(`  상태 : ${project.status}`);

  if (project.id) touchProject(project.id);

  console.log("");
  console.log("----------------------------------------");
  console.log("브라우저 좌하단 '🎨 편집 모드' 버튼을 켜면 호버 선택·클릭 편집 패널·");
  console.log("텍스트/이미지/색상/여백 저장이 그 자리에서 가능합니다.");
  console.log("----------------------------------------");
  console.log("");
}

module.exports = { devmode };
