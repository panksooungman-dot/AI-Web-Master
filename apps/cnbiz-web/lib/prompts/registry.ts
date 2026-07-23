import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

export interface PromptVersion {
  version: number;
  content: string;
  createdAt: string;
  variables?: string[];
}

export interface PromptRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  versions: PromptVersion[];
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = "prompts";
const DEFAULT_CATEGORY = "General";

/** 기존(카테고리 도입 이전) 레코드에는 category가 없을 수 있어 기본값으로 보정한다. */
function withDefaultCategory(record: PromptRecord): PromptRecord {
  return { ...record, category: record.category ?? DEFAULT_CATEGORY };
}

export async function listPrompts(store: CollectionStore = getDefaultStore()): Promise<PromptRecord[]> {
  const records = await store.list<PromptRecord>(COLLECTION);
  return records.map(withDefaultCategory);
}

export async function getPrompt(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<PromptRecord | undefined> {
  const records = await listPrompts(store);
  return records.find((prompt) => prompt.id === id);
}

export function getLatestVersion(prompt: PromptRecord): PromptVersion {
  return prompt.versions[prompt.versions.length - 1];
}

export async function createPrompt(
  name: string,
  description: string,
  content: string,
  category: string = DEFAULT_CATEGORY,
  variables?: string[],
  store: CollectionStore = getDefaultStore()
): Promise<PromptRecord> {
  const now = new Date().toISOString();

  const record: PromptRecord = {
    id: generateId("prompt"),
    name,
    description,
    category: category || DEFAULT_CATEGORY,
    versions: [{ version: 1, content, createdAt: now, variables }],
    createdAt: now,
    updatedAt: now,
  };

  const records = await store.list<PromptRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function addPromptVersion(
  id: string,
  content: string,
  variables?: string[],
  store: CollectionStore = getDefaultStore()
): Promise<PromptRecord | undefined> {
  const records = await store.list<PromptRecord>(COLLECTION);
  const index = records.findIndex((prompt) => prompt.id === id);

  if (index === -1) return undefined;

  const now = new Date().toISOString();
  const nextVersion = records[index].versions.length + 1;

  records[index] = {
    ...records[index],
    versions: [...records[index].versions, { version: nextVersion, content, createdAt: now, variables }],
    updatedAt: now,
  };

  await store.replaceAll(COLLECTION, records);

  return records[index];
}
