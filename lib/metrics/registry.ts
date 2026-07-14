import fs from "fs";
import path from "path";
import { listUsageViaCli, type UsageSummary } from "@/lib/ai/bridge";

/**
 * 요구사항 — Metrics. Audit Log(lib/audit/log.ts)는 최근 이력만 담는 상한(500건) 있는
 * 롤링 윈도우라 누적 카운터로 쓰기에 부적합하다(오래된 항목이 잘려나가면 카운트가 줄어듦).
 * 그래서 Metrics는 별도의 영구 누적 카운터 저장소를 둔다 — Audit Log와 같은 호출 지점에서
 * 함께 기록되지만(예: marketplace install 성공 시 audit 기록 + counter 증가), 저장 방식은 분리된다.
 */
export interface MetricsCounters {
  buildCount: number;
  websiteGenerationCount: number;
  aiTaskCount: number;
  marketplaceInstallCount: number;
  /** Design Automation Phase 2(Storyboard Generator) 신규 — 기존 4개 필드는 무변경. */
  storyboardGenerationCount: number;
  /** Design Automation Phase 3(Wireframe Generator) 신규 — 기존 5개 필드는 무변경. */
  wireframeGenerationCount: number;
}

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");
const DEFAULT_COUNTERS: MetricsCounters = {
  buildCount: 0,
  websiteGenerationCount: 0,
  aiTaskCount: 0,
  marketplaceInstallCount: 0,
  storyboardGenerationCount: 0,
  wireframeGenerationCount: 0,
};

function registryPath(baseDir: string): string {
  return path.join(baseDir, "metrics.json");
}

function ensureRegistryFile(baseDir: string): void {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const file = registryPath(baseDir);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(DEFAULT_COUNTERS, null, 2), "utf-8");
  }
}

export function readMetrics(baseDir: string = DEFAULT_BASE_DIR): MetricsCounters {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? { ...DEFAULT_COUNTERS, ...(parsed as Partial<MetricsCounters>) }
      : { ...DEFAULT_COUNTERS };
  } catch {
    return { ...DEFAULT_COUNTERS };
  }
}

/** 성공/실패와 무관하게 "그 기능이 몇 번 실행되었는가"를 센다(호출 시점마다 +1, 기본값 1). */
export function incrementMetric(
  name: keyof MetricsCounters,
  by = 1,
  baseDir: string = DEFAULT_BASE_DIR
): MetricsCounters {
  const counters = readMetrics(baseDir);
  const next: MetricsCounters = { ...counters, [name]: counters[name] + by };

  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(next, null, 2), "utf-8");

  return next;
}

export interface MetricsSummary {
  counters: MetricsCounters;
  /** packages/cli/src/providers/usage.ts의 요약 — 기존 lib/ai/bridge.ts의 listUsageViaCli()를 그대로 재사용(중복 계측 없음). */
  providerUsage: UsageSummary | null;
}

export async function getMetricsSummary(baseDir: string = DEFAULT_BASE_DIR): Promise<MetricsSummary> {
  const counters = readMetrics(baseDir);
  const usage = await listUsageViaCli();

  return {
    counters,
    providerUsage: usage.success ? usage.summary ?? null : null,
  };
}
