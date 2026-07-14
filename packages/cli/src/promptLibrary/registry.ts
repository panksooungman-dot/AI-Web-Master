import fs from "fs-extra";
import path from "path";

/**
 * lib/prompts/registry.ts(Next.js Dashboard)와 동일한 PromptRecord/PromptVersion
 * 형태를 의도적으로 복제한다 — 두 모듈이 같은 파일(<cwd>/lib/data/prompts.json)을
 * 읽고 쓰므로 `ai prompt`와 Dashboard의 Prompt Library 화면이 실제로 데이터를
 * 공유하지만, Next 앱 모듈을 CLI(별도 빌드 시스템)로 cross-import하지 않는다.
 */
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

const DEFAULT_CATEGORY = "General";

function registryPath(cwd: string): string {
  return path.join(cwd, "lib", "data", "prompts.json");
}

async function ensureRegistryFile(cwd: string): Promise<void> {
  const file = registryPath(cwd);
  await fs.ensureDir(path.dirname(file));

  if (!(await fs.pathExists(file))) {
    await fs.writeJson(file, [], { spaces: 2 });
  }
}

async function readRegistry(cwd: string): Promise<PromptRecord[]> {
  await ensureRegistryFile(cwd);

  try {
    const raw = await fs.readJson(registryPath(cwd));
    if (!Array.isArray(raw)) return [];
    return (raw as PromptRecord[]).map((record) => ({ category: DEFAULT_CATEGORY, ...record }));
  } catch {
    return [];
  }
}

async function writeRegistry(cwd: string, records: PromptRecord[]): Promise<void> {
  await ensureRegistryFile(cwd);
  await fs.writeJson(registryPath(cwd), records, { spaces: 2 });
}

export async function listPrompts(cwd: string, category?: string): Promise<PromptRecord[]> {
  const records = await readRegistry(cwd);
  return category ? records.filter((r) => r.category === category) : records;
}

export async function getPrompt(cwd: string, id: string): Promise<PromptRecord | undefined> {
  return (await readRegistry(cwd)).find((r) => r.id === id);
}

export function getLatestVersion(prompt: PromptRecord): PromptVersion {
  return prompt.versions[prompt.versions.length - 1];
}

export async function createPrompt(
  cwd: string,
  name: string,
  description: string,
  content: string,
  category: string = DEFAULT_CATEGORY,
  variables?: string[]
): Promise<PromptRecord> {
  const now = new Date().toISOString();

  const record: PromptRecord = {
    id: `prompt-${Date.now()}`,
    name,
    description,
    category: category || DEFAULT_CATEGORY,
    versions: [{ version: 1, content, createdAt: now, variables }],
    createdAt: now,
    updatedAt: now
  };

  const records = await readRegistry(cwd);
  records.push(record);
  await writeRegistry(cwd, records);

  return record;
}
