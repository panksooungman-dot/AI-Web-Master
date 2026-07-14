import fs from "fs";
import path from "path";

export interface CatalogCategory {
  id: string;
  description: string;
  count: number;
}

export interface CatalogSummary {
  categories: CatalogCategory[];
  totalAvailable: number;
}

export interface InstalledPackage {
  name: string;
  installedAt: string;
}

const DEFAULT_MANIFEST_PATH = path.join(process.cwd(), "marketplace", "manifest.json");
const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

interface ManifestShape {
  packages?: Record<string, { count?: number; description?: string }>;
}

/** Reads the real root marketplace/manifest.json — the single source of truth for catalog counts. */
export function getCatalogSummary(manifestPath: string = DEFAULT_MANIFEST_PATH): CatalogSummary {
  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    const packages = (parsed as ManifestShape).packages ?? {};

    const categories: CatalogCategory[] = Object.entries(packages).map(([id, value]) => ({
      id,
      description: value.description ?? "",
      count: typeof value.count === "number" ? value.count : 0,
    }));

    return {
      categories,
      totalAvailable: categories.reduce((sum, c) => sum + c.count, 0),
    };
  } catch {
    return { categories: [], totalAvailable: 0 };
  }
}

function installedPath(baseDir: string): string {
  return path.join(baseDir, "marketplace-installed.json");
}

function ensureInstalledFile(baseDir: string): void {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const file = installedPath(baseDir);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf-8");
  }
}

function readInstalled(baseDir: string): InstalledPackage[] {
  ensureInstalledFile(baseDir);

  try {
    const raw = fs.readFileSync(installedPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InstalledPackage[]) : [];
  } catch {
    return [];
  }
}

function writeInstalled(baseDir: string, records: InstalledPackage[]): void {
  ensureInstalledFile(baseDir);
  fs.writeFileSync(installedPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

export function listInstalled(baseDir: string = DEFAULT_BASE_DIR): InstalledPackage[] {
  return readInstalled(baseDir);
}

/** Tracking-only — does not touch any real files on disk (see marketplace module scope note). */
export function setInstalled(
  name: string,
  installed: boolean,
  baseDir: string = DEFAULT_BASE_DIR
): InstalledPackage[] {
  const records = readInstalled(baseDir);
  const withoutName = records.filter((r) => r.name !== name);

  const next = installed
    ? [...withoutName, { name, installedAt: new Date().toISOString() }]
    : withoutName;

  writeInstalled(baseDir, next);
  return next;
}
