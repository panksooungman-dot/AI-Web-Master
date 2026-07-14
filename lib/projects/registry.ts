import fs from "fs";
import path from "path";

export type ProjectStatus = "Active" | "Paused" | "Completed" | "Archived";

export interface ProjectRecord {
  id: string;
  name: string;
  company: string;
  type: string;
  description: string;
  workspaceId: string;
  workspaceName: string;
  workspacePath: string;
  status: ProjectStatus;
  createdAt: string;
  lastOpenedAt: string | null;
  imported?: boolean;
  gitRemoteUrl?: string;
}

export interface CreateProjectInput {
  name: string;
  company: string;
  type: string;
  description: string;
  workspaceId: string;
  workspaceName: string;
  workspacePath: string;
  imported?: boolean;
  gitRemoteUrl?: string;
}

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

function registryPath(baseDir: string): string {
  return path.join(baseDir, "projects.json");
}

function ensureRegistryFile(baseDir: string): void {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const file = registryPath(baseDir);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf-8");
  }
}

function readRegistry(baseDir: string): ProjectRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, records: ProjectRecord[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

export function listProjects(baseDir: string = DEFAULT_BASE_DIR): ProjectRecord[] {
  return readRegistry(baseDir);
}

export function getProject(id: string, baseDir: string = DEFAULT_BASE_DIR): ProjectRecord | undefined {
  return readRegistry(baseDir).find((project) => project.id === id);
}

export function createProject(
  input: CreateProjectInput,
  baseDir: string = DEFAULT_BASE_DIR
): ProjectRecord {
  const record: ProjectRecord = {
    id: `project-${Date.now()}`,
    name: input.name,
    company: input.company,
    type: input.type,
    description: input.description,
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    workspacePath: input.workspacePath,
    status: "Active",
    createdAt: new Date().toISOString(),
    lastOpenedAt: null,
    imported: input.imported,
    gitRemoteUrl: input.gitRemoteUrl,
  };

  const records = readRegistry(baseDir);
  records.push(record);
  writeRegistry(baseDir, records);

  return record;
}

export function touchProjectOpened(
  id: string,
  baseDir: string = DEFAULT_BASE_DIR
): ProjectRecord | undefined {
  const records = readRegistry(baseDir);
  const index = records.findIndex((project) => project.id === id);

  if (index === -1) return undefined;

  records[index] = { ...records[index], lastOpenedAt: new Date().toISOString() };
  writeRegistry(baseDir, records);

  return records[index];
}

/** Removes the project record only — does not touch its workspace folder on disk. */
export function deleteProject(id: string, baseDir: string = DEFAULT_BASE_DIR): boolean {
  const records = readRegistry(baseDir);
  const remaining = records.filter((project) => project.id !== id);

  if (remaining.length === records.length) return false;

  writeRegistry(baseDir, remaining);
  return true;
}
