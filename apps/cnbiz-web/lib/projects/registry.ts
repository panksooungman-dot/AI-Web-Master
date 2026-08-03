import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

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
  /** AI Business OS Customer Inquiry Pipeline이 자동 등록한 Project인지 여부(수동 생성/Import와 구분용). */
  autoProvisioned?: boolean;
  /** autoProvisioned인 경우 이 Project를 만든 WebsiteOrder(lib/websiteOrders) id. */
  websiteOrderId?: string;
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
  autoProvisioned?: boolean;
  websiteOrderId?: string;
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
    id: generateId("project"),
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
    autoProvisioned: input.autoProvisioned,
    websiteOrderId: input.websiteOrderId,
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
