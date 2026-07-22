import fs from "fs";
import path from "path";
import { createRecordId } from "@/lib/utils/id";

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

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");
const DEFAULT_CATEGORY = "General";

function registryPath(baseDir: string): string {
  return path.join(baseDir, "prompts.json");
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

function readRegistry(baseDir: string): PromptRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 기존(카테고리 도입 이전) 레코드에는 category가 없을 수 있어 기본값으로 보정한다.
    return (parsed as PromptRecord[]).map((record) => ({ ...record, category: record.category ?? DEFAULT_CATEGORY }));
  } catch {
    return [];
  }
}

function writeRegistry(records: PromptRecord[], baseDir: string): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

export function listPrompts(baseDir: string = DEFAULT_BASE_DIR): PromptRecord[] {
  return readRegistry(baseDir);
}

export function getPrompt(id: string, baseDir: string = DEFAULT_BASE_DIR): PromptRecord | undefined {
  return readRegistry(baseDir).find((prompt) => prompt.id === id);
}

export function getLatestVersion(prompt: PromptRecord): PromptVersion {
  return prompt.versions[prompt.versions.length - 1];
}

export function createPrompt(
  name: string,
  description: string,
  content: string,
  category: string = DEFAULT_CATEGORY,
  variables?: string[],
  baseDir: string = DEFAULT_BASE_DIR
): PromptRecord {
  const now = new Date().toISOString();

  const record: PromptRecord = {
    id: createRecordId("prompt"),
    name,
    description,
    category: category || DEFAULT_CATEGORY,
    versions: [{ version: 1, content, createdAt: now, variables }],
    createdAt: now,
    updatedAt: now,
  };

  const records = readRegistry(baseDir);
  records.push(record);
  writeRegistry(records, baseDir);

  return record;
}

export function addPromptVersion(
  id: string,
  content: string,
  variables?: string[],
  baseDir: string = DEFAULT_BASE_DIR
): PromptRecord | undefined {
  const records = readRegistry(baseDir);
  const index = records.findIndex((prompt) => prompt.id === id);

  if (index === -1) return undefined;

  const now = new Date().toISOString();
  const nextVersion = records[index].versions.length + 1;

  records[index] = {
    ...records[index],
    versions: [...records[index].versions, { version: nextVersion, content, createdAt: now, variables }],
    updatedAt: now,
  };

  writeRegistry(records, baseDir);

  return records[index];
}
