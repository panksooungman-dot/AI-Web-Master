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

// 같은 경로(workspacePath)의 프로젝트가 이미 등록되어 있으면 최근 사용
// 시각만 갱신하고, 없으면 새로 등록한다. `ai` 실행 시 현재 폴더를 매번
// 이 함수로 등록/갱신해 "최근 프로젝트 목록"이 항상 최신 상태를 반영하게 한다.
function upsertProject(entry) {
  const projects = listProjects();
  const target = normalizePath(entry.workspacePath);
  const index = projects.findIndex((p) => normalizePath(p.workspacePath) === target);

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

  projects[index] = { ...projects[index], lastOpenedAt: new Date().toISOString() };
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
  getRecentProjects,
  normalizePath,
};
