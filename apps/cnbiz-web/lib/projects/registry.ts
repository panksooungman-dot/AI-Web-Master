import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";

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

const COLLECTION = "projects";

export async function listProjects(store: CollectionStore = getDefaultStore()): Promise<ProjectRecord[]> {
  return store.list<ProjectRecord>(COLLECTION);
}

export async function getProject(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ProjectRecord | undefined> {
  const records = await store.list<ProjectRecord>(COLLECTION);
  return records.find((project) => project.id === id);
}

export async function createProject(
  input: CreateProjectInput,
  store: CollectionStore = getDefaultStore()
): Promise<ProjectRecord> {
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

  const records = await store.list<ProjectRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function touchProjectOpened(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ProjectRecord | undefined> {
  const records = await store.list<ProjectRecord>(COLLECTION);
  const index = records.findIndex((project) => project.id === id);

  if (index === -1) return undefined;

  records[index] = { ...records[index], lastOpenedAt: new Date().toISOString() };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

/** Removes the project record only — does not touch its workspace folder on disk. */
export async function deleteProject(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<boolean> {
  const records = await store.list<ProjectRecord>(COLLECTION);
  const remaining = records.filter((project) => project.id !== id);

  if (remaining.length === records.length) return false;

  await store.replaceAll(COLLECTION, remaining);
  return true;
}
