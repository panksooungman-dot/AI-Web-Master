import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import type { ProjectRequestInput, ProjectRequestRecord, RequestStatus } from "./types";

const COLLECTION = "project-requests";

export async function listRequests(
  store: CollectionStore = getDefaultStore()
): Promise<ProjectRequestRecord[]> {
  const records = await store.list<ProjectRequestRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRequest(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ProjectRequestRecord | undefined> {
  const records = await store.list<ProjectRequestRecord>(COLLECTION);
  return records.find((request) => request.id === id);
}

export async function createRequest(
  input: ProjectRequestInput,
  store: CollectionStore = getDefaultStore()
): Promise<ProjectRequestRecord> {
  const now = new Date().toISOString();
  const record: ProjectRequestRecord = {
    id: `request-${Date.now()}`,
    ...input,
    status: "New",
    createdAt: now,
    updatedAt: now,
  };

  const records = await store.list<ProjectRequestRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
  store: CollectionStore = getDefaultStore()
): Promise<ProjectRequestRecord | undefined> {
  const records = await store.list<ProjectRequestRecord>(COLLECTION);
  const index = records.findIndex((request) => request.id === id);
  if (index === -1) return undefined;

  records[index] = { ...records[index], status, updatedAt: new Date().toISOString() };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}
