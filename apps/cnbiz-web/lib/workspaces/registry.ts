import fs from "fs";
import path from "path";
import { createRecordId } from "@/lib/utils/id";

export interface WorkspaceRecord {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

const REGISTRY_PATH = path.join(process.cwd(), "lib", "data", "workspaces.json");

function ensureRegistryFile(): void {
  const dir = path.dirname(REGISTRY_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(REGISTRY_PATH)) {
    fs.writeFileSync(REGISTRY_PATH, "[]", "utf-8");
  }
}

function readRegistry(): WorkspaceRecord[] {
  ensureRegistryFile();

  try {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkspaceRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(records: WorkspaceRecord[]): void {
  ensureRegistryFile();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export function listWorkspaces(): WorkspaceRecord[] {
  const records = readRegistry();
  const existing = records.filter((record) => fs.existsSync(record.path));

  if (existing.length !== records.length) {
    writeRegistry(existing);
  }

  return existing;
}

export function getWorkspace(id: string): WorkspaceRecord | undefined {
  return listWorkspaces().find((record) => record.id === id);
}

export function createWorkspace(name: string, targetPath: string): WorkspaceRecord {
  fs.mkdirSync(targetPath, { recursive: true });

  const record: WorkspaceRecord = {
    id: createRecordId("workspace"),
    name,
    path: targetPath,
    createdAt: new Date().toISOString(),
  };

  const records = readRegistry();
  records.push(record);
  writeRegistry(records);

  return record;
}
