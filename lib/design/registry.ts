import fs from "fs";
import path from "path";
import type { DesignPlanRecord } from "./types";

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

function registryPath(baseDir: string): string {
  return path.join(baseDir, "design-plans.json");
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

function readRegistry(baseDir: string): DesignPlanRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DesignPlanRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, records: DesignPlanRecord[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

function createRecordId(): string {
  return `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDesignPlan(
  entry: Omit<DesignPlanRecord, "id" | "createdAt">,
  baseDir: string = DEFAULT_BASE_DIR
): DesignPlanRecord {
  const record: DesignPlanRecord = {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const records = readRegistry(baseDir);
  records.push(record);
  writeRegistry(baseDir, records);

  return record;
}

/** 최신순(newest first). */
export function listDesignPlans(baseDir: string = DEFAULT_BASE_DIR): DesignPlanRecord[] {
  return [...readRegistry(baseDir)].reverse();
}

export function getDesignPlan(id: string, baseDir: string = DEFAULT_BASE_DIR): DesignPlanRecord | null {
  return readRegistry(baseDir).find((record) => record.id === id) ?? null;
}
