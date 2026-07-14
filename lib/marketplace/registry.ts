import fs from "fs";
import path from "path";
import { execute } from "@/lib/commandEngine/engine";

export interface CatalogCategory {
  id: string;
  description: string;
  count: number;
}

export interface CatalogSummary {
  categories: CatalogCategory[];
  totalAvailable: number;
}

const DEFAULT_MANIFEST_PATH = path.join(process.cwd(), "marketplace", "manifest.json");

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

export type PackageType = "agent" | "workflow" | "skill";

export interface MarketplaceEntry {
  name: string;
  type: PackageType;
  version: string;
  description: string;
  author: string;
  createdAt: string;
  publishedAt: string;
}

export interface InstalledPackageInfo {
  type: PackageType;
  name: string;
  installedVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  description: string;
  author: string;
  dir: string;
}

export interface UpdateResult {
  type: PackageType;
  name: string;
  from: string;
  to: string;
  updated: boolean;
}

export interface PublishOutcome {
  published: MarketplaceEntry[];
  skipped: { name: string; type: string; reason: string }[];
  failed: { name: string; type: string; error: string }[];
}

interface CliRunResult {
  success: boolean;
  error?: string;
  raw: Record<string, unknown>;
}

/**
 * Shells out to `node packages/cli/dist/index.js marketplace ...args --json` (reuses
 * lib/commandEngine/engine.ts's execute(), same bridge pattern as app/api/websites/route.ts).
 * The CLI is the single implementation of every marketplace operation — this bridge only
 * builds the command line and parses the `--json` output, it does not reimplement any logic.
 */
async function runMarketplaceCli(args: (string | undefined)[], cwd: string = process.cwd()): Promise<CliRunResult> {
  const cliEntry = path.join(process.cwd(), "packages", "cli", "dist", "index.js");

  if (!fs.existsSync(cliEntry)) {
    return {
      success: false,
      error: "packages/cli가 아직 빌드되지 않았습니다. `npm run build --workspace=@ai-business-os/cli`를 먼저 실행하세요.",
      raw: {},
    };
  }

  const tokens = [cliEntry, "marketplace", ...args.filter((a): a is string => Boolean(a)), "--json"];
  const command = `node ${tokens.map((t) => `"${t}"`).join(" ")}`;

  const result = await execute(command, { cwd, category: "development" });

  try {
    const parsed = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    return { success: Boolean(parsed.success), error: typeof parsed.error === "string" ? parsed.error : undefined, raw: parsed };
  } catch {
    return {
      success: false,
      error: result.error ?? (result.stderr.trim() || "CLI 응답을 해석할 수 없습니다."),
      raw: {},
    };
  }
}

export async function searchPackages(
  keyword?: string,
  type?: PackageType
): Promise<{ success: boolean; results: MarketplaceEntry[]; error?: string }> {
  const result = await runMarketplaceCli(["search", keyword, type ? "--type" : undefined, type]);
  return { success: result.success, results: (result.raw.results as MarketplaceEntry[]) ?? [], error: result.error };
}

export async function getInstalledPackages(): Promise<{
  success: boolean;
  installed: InstalledPackageInfo[];
  error?: string;
}> {
  const result = await runMarketplaceCli(["update"]);
  return {
    success: result.success,
    installed: (result.raw.installed as InstalledPackageInfo[]) ?? [],
    error: result.error,
  };
}

export async function installPackage(
  name: string,
  type?: PackageType
): Promise<{ success: boolean; entry?: MarketplaceEntry; targetDir?: string; error?: string }> {
  const result = await runMarketplaceCli(["install", name, type ? "--type" : undefined, type]);
  return {
    success: result.success,
    entry: result.raw.entry as MarketplaceEntry | undefined,
    targetDir: result.raw.targetDir as string | undefined,
    error: result.error,
  };
}

export async function removePackage(
  name: string,
  type?: PackageType
): Promise<{ success: boolean; error?: string }> {
  const result = await runMarketplaceCli(["remove", name, type ? "--type" : undefined, type]);
  return { success: result.success, error: result.error };
}

export async function updatePackage(
  name: string,
  type?: PackageType
): Promise<{ success: boolean; result?: UpdateResult; error?: string }> {
  const result = await runMarketplaceCli(["update", name, type ? "--type" : undefined, type]);
  return {
    success: result.success,
    result: result.success ? (result.raw as unknown as UpdateResult) : undefined,
    error: result.error,
  };
}

export async function publishPackages(name?: string): Promise<{ success: boolean; outcome?: PublishOutcome; error?: string }> {
  const result = await runMarketplaceCli(["publish", name]);
  return {
    success: result.success,
    outcome: result.success
      ? {
          published: (result.raw.published as MarketplaceEntry[]) ?? [],
          skipped: (result.raw.skipped as PublishOutcome["skipped"]) ?? [],
          failed: (result.raw.failed as PublishOutcome["failed"]) ?? [],
        }
      : undefined,
    error: result.error,
  };
}
