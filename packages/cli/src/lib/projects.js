const fs = require("node:fs");
const path = require("node:path");
const { PROJECTS_FILE, ensureConfigDir } = require("./config");

function listProjects() {
  ensureConfigDir();
  if (!fs.existsSync(PROJECTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(PROJECTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  ensureConfigDir();
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

function addProject(project) {
  const projects = listProjects();
  projects.push(project);
  saveProjects(projects);
  return project;
}

function touchProject(id) {
  const projects = listProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return;
  projects[index] = { ...projects[index], lastOpenedAt: new Date().toISOString() };
  saveProjects(projects);
}

// 경로 비교용 정규화(대소문자·구분자 차이를 흡수). 반환값은 표시에 쓰지 않는다.
function normalizePath(workspacePath) {
  return path.resolve(workspacePath).replace(/\\/g, "/").toLowerCase();
}

// 두 프로젝트가 "같은 프로젝트"인지 판단하는 유일한 기준. 경로(workspacePath)가
// 아니라 이름(name)으로 판단한다 — 프로젝트가 다른 컴퓨터·다른 드라이브·다른
// 사용자 폴더로 옮겨져도 이름(package.json의 name, 또는 폴더명)은 그대로이므로,
// 경로가 바뀌어도 같은 프로젝트로 인식해 레지스트리 항목을 갱신할 수 있어야
// 한다. 이 기준을 별도 함수로 분리해, 앞으로 경로가 또 바뀌어도(예: 다음 컴퓨터
// 이전) upsertProject()가 자동으로 같은 로직으로 갱신하도록 한다.
function isSameProject(a, b) {
  return a.name === b.name;
}

// 같은 프로젝트(이름 동일)가 이미 등록되어 있으면 새 항목을 추가하지 않고
// 그 항목의 workspacePath를 최신 경로로 덮어쓴다(예: D:\AI-Web-Master →
// C:\Users\cnbiz\AI-Web-Master로 자동 갱신). 기존 경로 값은 이 대입으로
// 그 자리에서 사라지므로 별도의 삭제 처리가 필요 없다. 같은 이름의 프로젝트가
// 전혀 없으면 새로 등록한다. `ai` 실행 시 현재 폴더를 매번 이 함수로
// 등록/갱신해 "최근 프로젝트 목록"이 항상 최신 경로를 반영하게 한다.
function upsertProject(entry) {
  const projects = listProjects();
  const index = projects.findIndex((p) => isSameProject(p, entry));

  if (index === -1) {
    const project = {
      id: `project-${Date.now()}`,
      name: entry.name,
      company: entry.company || "-",
      type: entry.type || "-",
      description: entry.description || "",
      workspacePath: entry.workspacePath.replace(/\\/g, "/"),
      status: "Active",
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    };
    projects.push(project);
    saveProjects(projects);
    return project;
  }

  projects[index] = {
    ...projects[index],
    workspacePath: entry.workspacePath.replace(/\\/g, "/"),
    lastOpenedAt: new Date().toISOString(),
  };
  saveProjects(projects);
  return projects[index];
}

// lastOpenedAt(없으면 createdAt) 기준 최근 사용순으로 최대 limit개를 반환한다.
function getRecentProjects(limit = 8) {
  const projects = listProjects();
  return [...projects]
    .sort((a, b) => {
      const at = new Date(a.lastOpenedAt || a.createdAt || 0).getTime();
      const bt = new Date(b.lastOpenedAt || b.createdAt || 0).getTime();
      return bt - at;
    })
    .slice(0, limit);
}

module.exports = {
  listProjects,
  saveProjects,
  addProject,
  touchProject,
  upsertProject,
  isSameProject,
  getRecentProjects,
  normalizePath,
};
