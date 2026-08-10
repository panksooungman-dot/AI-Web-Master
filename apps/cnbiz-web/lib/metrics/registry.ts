import { listUsageViaCli, type UsageSummary } from "@/lib/ai/bridge";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";

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
  /** Design Automation Phase 4(Prototype Generator) 신규 — 기존 6개 필드는 무변경. */
  prototypeGenerationCount: number;
  /** Design Automation Phase 5(Claude Design Integration) 신규 — 기존 7개 필드는 무변경. */
  claudeDesignGenerationCount: number;
  /** Design Automation Phase 6(Customer Review & Approval) 신규 — 기존 8개 필드는 무변경. */
  reviewCount: number;
  approvalCount: number;
  revisionCount: number;
  /** Design Automation Phase 7(Figma Import/Export) 신규 — 기존 11개 필드는 무변경. */
  figmaImportCount: number;
  figmaExportCount: number;
  /** Design Automation Phase 8(Design Sync) 신규 — 기존 13개 필드는 무변경. */
  designSyncCount: number;
  conflictCount: number;
  rollbackCount: number;
  /** Design Automation Phase 9(Website Builder Integration) 신규 — 기존 16개 필드는 무변경.
   *  websiteGenerationCount와 별개로, "Design Automation 파이프라인에서 트리거된 빌드"만 센다. */
  designWebsiteBuildCount: number;
  /** 기술 견적서 자동 생성(lib/estimates) 신규 — 기존 17개 필드는 무변경. */
  estimateGenerationCount: number;
  /** 기능 명세서 자동 생성(lib/specifications) 신규 — 기존 18개 필드는 무변경. */
  specificationGenerationCount: number;
  /** 프로젝트 일정 자동 생성(lib/timeline) 신규 — 기존 19개 필드는 무변경. */
  timelineGenerationCount: number;
  /** 계약서 자동 생성(lib/contracts) 신규 — 기존 20개 필드는 무변경. */
  contractGenerationCount: number;
  /** 제안서 자동 생성(lib/proposals) 신규 — 기존 21개 필드는 무변경. */
  proposalGenerationCount: number;
  /** Customer Portal V1(lib/customerPortal) 신규 — 기존 22개 필드는 무변경. */
  customerPortalVisitCount: number;
  /** AI Business OS 9단계 개발 프로세스 확장(Database/API/Backend/Test Plan Design) 신규 —
   *  기존 23개 필드는 무변경. */
  databaseDesignGenerationCount: number;
  apiDesignGenerationCount: number;
  backendDesignGenerationCount: number;
  testPlanGenerationCount: number;
  /** Backend Code Generation(lib/design/backend-code.ts) 신규 — 기존 27개 필드는 무변경. */
  backendCodeGenerationCount: number;
  /** API Route Code Generation(lib/design/api-code.ts) 신규 — 기존 28개 필드는 무변경. */
  apiCodeGenerationCount: number;
  /** Database Migration Code Generation(lib/design/database-code.ts) 신규 — 기존 29개 필드는 무변경. */
  databaseCodeGenerationCount: number;
  /** Test Code Generation(lib/design/test-code.ts) 신규 — 기존 30개 필드는 무변경. */
  testCodeGenerationCount: number;
}

const COLLECTION = "metrics";
const DOC_ID = "counters";
const DEFAULT_COUNTERS: MetricsCounters = {
  buildCount: 0,
  websiteGenerationCount: 0,
  aiTaskCount: 0,
  marketplaceInstallCount: 0,
  storyboardGenerationCount: 0,
  wireframeGenerationCount: 0,
  prototypeGenerationCount: 0,
  claudeDesignGenerationCount: 0,
  reviewCount: 0,
  approvalCount: 0,
  revisionCount: 0,
  figmaImportCount: 0,
  figmaExportCount: 0,
  designSyncCount: 0,
  conflictCount: 0,
  rollbackCount: 0,
  designWebsiteBuildCount: 0,
  estimateGenerationCount: 0,
  specificationGenerationCount: 0,
  timelineGenerationCount: 0,
  contractGenerationCount: 0,
  proposalGenerationCount: 0,
  customerPortalVisitCount: 0,
  databaseDesignGenerationCount: 0,
  apiDesignGenerationCount: 0,
  backendDesignGenerationCount: 0,
  testPlanGenerationCount: 0,
  backendCodeGenerationCount: 0,
  apiCodeGenerationCount: 0,
  databaseCodeGenerationCount: 0,
  testCodeGenerationCount: 0,
};

export async function readMetrics(store: CollectionStore = getDefaultStore()): Promise<MetricsCounters> {
  const doc = await store.getDoc<Partial<MetricsCounters>>(COLLECTION, DOC_ID);
  return doc ? { ...DEFAULT_COUNTERS, ...doc } : { ...DEFAULT_COUNTERS };
}

/** 성공/실패와 무관하게 "그 기능이 몇 번 실행되었는가"를 센다(호출 시점마다 +1, 기본값 1). */
export async function incrementMetric(
  name: keyof MetricsCounters,
  by = 1,
  store: CollectionStore = getDefaultStore()
): Promise<MetricsCounters> {
  const counters = await readMetrics(store);
  const next: MetricsCounters = { ...counters, [name]: counters[name] + by };

  await store.setDoc(COLLECTION, DOC_ID, next);

  return next;
}

export interface MetricsSummary {
  counters: MetricsCounters;
  /** packages/cli/src/providers/usage.ts의 요약 — 기존 lib/ai/bridge.ts의 listUsageViaCli()를 그대로 재사용(중복 계측 없음). */
  providerUsage: UsageSummary | null;
}

export async function getMetricsSummary(store: CollectionStore = getDefaultStore()): Promise<MetricsSummary> {
  const counters = await readMetrics(store);
  const usage = await listUsageViaCli();

  return {
    counters,
    providerUsage: usage.success ? usage.summary ?? null : null,
  };
}
