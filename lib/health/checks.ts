import fs from "fs";
import path from "path";
import { runCatalogCommand } from "@/lib/commandEngine/engine";
import type { BackgroundExecuteResult, ExecuteResult } from "@/lib/commandEngine/types";

export interface GitStatusResult {
  branch: string | null;
  clean: boolean;
  raw: string;
}

export interface DiskUsageResult {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
}

export type HealthCheckId = "build" | "test" | "coverage";

export interface CheckResult {
  success: boolean;
  summary: string;
  ranAt: string;
  durationMs: number;
  coveragePct?: number;
}

export type HealthCache = Partial<Record<HealthCheckId, CheckResult>>;

function isExecuteResult(value: ExecuteResult | BackgroundExecuteResult): value is ExecuteResult {
  return "stdout" in value;
}

export async function getGitStatus(cwd: string): Promise<GitStatusResult> {
  const result = await runCatalogCommand("git:status", cwd);
  const stdout = isExecuteResult(result) ? result.stdout : "";

  const branchMatch = stdout.match(/On branch (\S+)/);

  return {
    branch: branchMatch?.[1] ?? null,
    clean: /nothing to commit, working tree clean/.test(stdout),
    raw: stdout.trim(),
  };
}

/** Node built-in, no dependency. */
export function getDiskUsage(cwd: string): DiskUsageResult {
  const stats = fs.statfsSync(cwd);
  const totalBytes = stats.blocks * stats.bsize;
  const freeBytes = stats.bfree * stats.bsize;

  return { totalBytes, freeBytes, usedBytes: totalBytes - freeBytes };
}

const CATALOG_ID: Record<HealthCheckId, string> = {
  build: "dev:build",
  test: "dev:test",
  coverage: "dev:coverage",
};

/** Runs `npm run build|test|coverage` for real via the existing command engine — manual, button-triggered only. */
export async function runHealthCheck(check: HealthCheckId, cwd: string): Promise<CheckResult> {
  const startedAt = Date.now();
  const result = await runCatalogCommand(CATALOG_ID[check], cwd);
  const durationMs = Date.now() - startedAt;

  if (!isExecuteResult(result)) {
    return {
      success: false,
      summary: "실행 결과를 확인할 수 없습니다.",
      ranAt: new Date().toISOString(),
      durationMs,
    };
  }

  const base: CheckResult = {
    success: result.success,
    summary: result.success
      ? "성공"
      : (result.error ?? (result.stderr.trim() || "실패")).slice(0, 300),
    ranAt: new Date().toISOString(),
    durationMs,
  };

  if (check === "coverage" && result.success) {
    base.coveragePct = readCoverageSummaryPct(cwd);
  }

  return base;
}

function readCoverageSummaryPct(cwd: string): number | undefined {
  try {
    const summaryPath = path.join(cwd, "coverage", "coverage-summary.json");
    const raw = fs.readFileSync(summaryPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    const total = (parsed as { total?: { lines?: { pct?: number } } }).total;
    return typeof total?.lines?.pct === "number" ? total.lines.pct : undefined;
  } catch {
    return undefined;
  }
}

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

function cachePath(baseDir: string): string {
  return path.join(baseDir, "health-checks.json");
}

function ensureCacheFile(baseDir: string): void {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const file = cachePath(baseDir);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "{}", "utf-8");
  }
}

export function readHealthCache(baseDir: string = DEFAULT_BASE_DIR): HealthCache {
  ensureCacheFile(baseDir);

  try {
    const raw = fs.readFileSync(cachePath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as HealthCache) : {};
  } catch {
    return {};
  }
}

export function writeHealthCacheEntry(
  check: HealthCheckId,
  result: CheckResult,
  baseDir: string = DEFAULT_BASE_DIR
): HealthCache {
  const cache = readHealthCache(baseDir);
  const next: HealthCache = { ...cache, [check]: result };

  ensureCacheFile(baseDir);
  fs.writeFileSync(cachePath(baseDir), JSON.stringify(next, null, 2), "utf-8");

  return next;
}

