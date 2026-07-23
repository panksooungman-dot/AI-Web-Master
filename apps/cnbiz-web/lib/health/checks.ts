import fs from "fs";
import os from "os";
import path from "path";
import { runCatalogCommand } from "@/lib/commandEngine/engine";
import type { BackgroundExecuteResult, ExecuteResult } from "@/lib/commandEngine/types";
import { countActiveSessions } from "@/lib/auth/session";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";

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

export interface CpuInfo {
  cores: number;
  model: string;
  loadPercent: number;
}

export interface MemoryInfo {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
}

export interface SystemInfo {
  cpu: CpuInfo;
  memory: MemoryInfo;
  disk: DiskUsageResult;
  nodeVersion: string;
  /** 이 Next.js 서버 프로세스의 uptime(초) — OS 전체 uptime이 아니다. */
  uptimeSeconds: number;
  activeSessions: number;
}

function sampleCpuTimes(): { idle: number; total: number } {
  let idle = 0;
  let total = 0;

  for (const cpu of os.cpus()) {
    for (const key of Object.keys(cpu.times) as (keyof typeof cpu.times)[]) {
      total += cpu.times[key];
    }
    idle += cpu.times.idle;
  }

  return { idle, total };
}

/**
 * os.loadavg()는 Windows에서 항상 [0,0,0]을 반환해 사용할 수 없다(Node 문서에 명시된 제약).
 * 대신 os.cpus()의 누적 tick을 두 시점에서 샘플링해 그 구간의 실제 사용률을 계산한다
 * (Node 내장 모듈만 사용, 신규 의존성 없음).
 */
async function getCpuLoadPercent(sampleMs = 100): Promise<number> {
  const start = sampleCpuTimes();
  await new Promise((resolve) => setTimeout(resolve, sampleMs));
  const end = sampleCpuTimes();

  const idleDiff = end.idle - start.idle;
  const totalDiff = end.total - start.total;

  return totalDiff <= 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 100);
}

/** 요구사항 — Health Dashboard: CPU·Memory·Disk·Node version·Uptime·Active sessions. */
export async function getSystemInfo(cwd: string): Promise<SystemInfo> {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  const loadPercent = await getCpuLoadPercent();

  return {
    cpu: { cores: cpus.length, model: cpus[0]?.model ?? "unknown", loadPercent },
    memory: { totalBytes: totalMem, freeBytes: freeMem, usedBytes: totalMem - freeMem },
    disk: getDiskUsage(cwd),
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    activeSessions: await countActiveSessions(),
  };
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

const COLLECTION = "health";
const DOC_ID = "checks";

export async function readHealthCache(store: CollectionStore = getDefaultStore()): Promise<HealthCache> {
  const doc = await store.getDoc<HealthCache>(COLLECTION, DOC_ID);
  return doc ?? {};
}

export async function writeHealthCacheEntry(
  check: HealthCheckId,
  result: CheckResult,
  store: CollectionStore = getDefaultStore()
): Promise<HealthCache> {
  const cache = await readHealthCache(store);
  const next: HealthCache = { ...cache, [check]: result };

  await store.setDoc(COLLECTION, DOC_ID, next);

  return next;
}

