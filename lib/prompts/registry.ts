import fs from "fs";
import path from "path";

export interface PromptVersion {
  version: number;
  content: string;
  createdAt: string;
}

export interface PromptRecord {
  id: string;
  name: string;
  description: string;
  versions: PromptVersion[];
  createdAt: string;
  updatedAt: string;
}

const REGISTRY_PATH = path.join(process.cwd(), "lib", "data", "prompts.json");

function ensureRegistryFile(): void {
  const dir = path.dirname(REGISTRY_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(REGISTRY_PATH)) {
    fs.writeFileSync(REGISTRY_PATH, "[]", "utf-8");
  }
}

function readRegistry(): PromptRecord[] {
  ensureRegistryFile();

  try {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PromptRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(records: PromptRecord[]): void {
  ensureRegistryFile();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export function listPrompts(): PromptRecord[] {
  return readRegistry();
}

export function getPrompt(id: string): PromptRecord | undefined {
  return readRegistry().find((prompt) => prompt.id === id);
}

export function getLatestVersion(prompt: PromptRecord): PromptVersion {
  return prompt.versions[prompt.versions.length - 1];
}

export function createPrompt(
  name: string,
  description: string,
  content: string
): PromptRecord {
  const now = new Date().toISOString();

  const record: PromptRecord = {
    id: `prompt-${Date.now()}`,
    name,
    description,
    versions: [{ version: 1, content, createdAt: now }],
    createdAt: now,
    updatedAt: now,
  };

  const records = readRegistry();
  records.push(record);
  writeRegistry(records);

  return record;
}

export function addPromptVersion(id: string, content: string): PromptRecord | undefined {
  const records = readRegistry();
  const index = records.findIndex((prompt) => prompt.id === id);

  if (index === -1) return undefined;

  const now = new Date().toISOString();
  const nextVersion = records[index].versions.length + 1;

  records[index] = {
    ...records[index],
    versions: [...records[index].versions, { version: nextVersion, content, createdAt: now }],
    updatedAt: now,
  };

  writeRegistry(records);

  return records[index];
}
