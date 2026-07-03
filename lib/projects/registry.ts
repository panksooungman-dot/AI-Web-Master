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
}

export interface CreateProjectInput {
  name: string;
  company: string;
  type: string;
  description: string;
  workspaceId: string;
  workspaceName: string;
  workspacePath: string;
}

const REGISTRY_PATH = path.join(process.cwd(), "lib", "data", "projects.json");

function ensureRegistryFile(): void {
  const dir = path.dirname(REGISTRY_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(REGISTRY_PATH)) {
    fs.writeFileSync(REGISTRY_PATH, "[]", "utf-8");
  }
}

function readRegistry(): ProjectRecord[] {
  ensureRegistryFile();

  try {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(records: ProjectRecord[]): void {
  ensureRegistryFile();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export function listProjects(): ProjectRecord[] {
  return readRegistry();
}

export function getProject(id: string): ProjectRecord | undefined {
  return readRegistry().find((project) => project.id === id);
}

export function createProject(input: CreateProjectInput): ProjectRecord {
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
  };

  const records = readRegistry();
  records.push(record);
  writeRegistry(records);

  return record;
}

export function touchProjectOpened(id: string): ProjectRecord | undefined {
  const records = readRegistry();
  const index = records.findIndex((project) => project.id === id);

  if (index === -1) return undefined;

  records[index] = { ...records[index], lastOpenedAt: new Date().toISOString() };
  writeRegistry(records);

  return records[index];
}
