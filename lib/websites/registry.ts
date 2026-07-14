import fs from "fs";
import path from "path";

export type WebsiteGenerationStatus = "Success" | "Failed";

export interface WebsiteRecord {
  id: string;
  name: string;
  siteType: string;
  outDir: string;
  status: WebsiteGenerationStatus;
  simulatedContent: boolean;
  error?: string;
  createdAt: string;
}

export interface CreateWebsiteRecordInput {
  name: string;
  siteType: string;
  outDir: string;
  status: WebsiteGenerationStatus;
  simulatedContent: boolean;
  error?: string;
}

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

function registryPath(baseDir: string): string {
  return path.join(baseDir, "websites.json");
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

function readRegistry(baseDir: string): WebsiteRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WebsiteRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, records: WebsiteRecord[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

/** Newest first — this is the "Recent Websites / Generation History" list. */
export function listWebsites(baseDir: string = DEFAULT_BASE_DIR): WebsiteRecord[] {
  return [...readRegistry(baseDir)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createWebsiteRecord(
  input: CreateWebsiteRecordInput,
  baseDir: string = DEFAULT_BASE_DIR
): WebsiteRecord {
  const record: WebsiteRecord = {
    id: `website-${Date.now()}`,
    name: input.name,
    siteType: input.siteType,
    outDir: input.outDir,
    status: input.status,
    simulatedContent: input.simulatedContent,
    error: input.error,
    createdAt: new Date().toISOString(),
  };

  const records = readRegistry(baseDir);
  records.push(record);
  writeRegistry(baseDir, records);

  return record;
}
