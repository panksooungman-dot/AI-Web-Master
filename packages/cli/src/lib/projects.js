const fs = require("node:fs");
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

module.exports = { listProjects, saveProjects, addProject, touchProject };
