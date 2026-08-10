import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation Extension — Test Code Generation (AI Business OS 9단계 개발 프로세스의
 * "08 테스트"를 실제 실행 가능한 테스트 코드로 완성하는 단계). Test Plan
 * (lib/design/testplan-design.ts)의 테스트 케이스(제목·단계·기대 결과 — 자연어)를 Backend
 * Code(lib/design/backend-code.ts)가 만든 실제 서비스 함수를 대상으로 검증하는 실제 Vitest
 * 테스트 파일로 번역한다.
 *
 * TestCase.steps/expectedResult는 자연어 문장이라 backend-code.ts와 마찬가지로 AI가 필요하다 —
 * 이번에도 배치 병렬 호출 + 결정론적 폴백 패턴을 그대로 재사용한다. 통합 테스트(target이
 * "METHOD /path" 형태)도 이 환경에는 실제 HTTP 트랜스포트가 없으므로, 그 엔드포인트가 호출하는
 * 동일 서비스 함수를 대상으로 한 단계 낮춰 검증한다(unit test와 동일한 방식) — API Code
 * (lib/design/api-code.ts)가 만든 Route Handler는 서비스 함수를 그대로 호출하는 얇은 wrapper라
 * 서비스 함수 검증이 사실상 동일한 신뢰도를 제공한다.
 */

export interface GeneratedTestFile {
  /** 프로젝트 루트 기준 상대 경로(예: "lib/services/__tests__/reservations.test.ts"). */
  path: string;
  /** 완전한 Vitest 테스트 소스(실제 실행 가능해야 한다). */
  code: string;
}

/** 생성된 파일이 실제로 동작하려면 프로젝트의 package.json에 반영돼야 하는 것들 —
 *  website-fullstack-adapter.ts가 이 값들을 실제 package.json에 병합한다. */
export interface PackageRequirements {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface TestCodeContent {
  files: GeneratedTestFile[];
  /** 수동 작업이 필요한 부분에 대한 안내(한국어) — 예: 일부 테스트가 placeholder로 남음. */
  notes: string;
  packageRequirements?: PackageRequirements;
}

export interface TestCodeRecord {
  id: string;
  /** 이 Test Code가 어떤 Test Plan(lib/design/testplan-design.ts) 위에서 생성됐는지. */
  testPlanId: string;
  /** 테스트가 대상으로 하는 실제 서비스 함수가 어디 있는지 알기 위한 Backend Code 참조. */
  backendCodeId: string;
  /** TestPlanRecord.planId를 그대로 복사(다른 Phase와 동일한 편의 체인). */
  planId: string;
  /** 동일 testPlanId에 대해 다시 생성하면 새 레코드가 추가되며 1씩 증가한다. */
  version: number;
  content: TestCodeContent;
  /** 테스트 케이스 중 하나라도 AI 응답 없이 placeholder(TODO)로 결정론적 폴백됐는지. */
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const COLLECTION = "design-test-code";

export async function createTestCode(
  entry: Omit<TestCodeRecord, "id" | "createdAt" | "version"> & { version?: number },
  store: CollectionStore = getDefaultStore()
): Promise<TestCodeRecord> {
  const records = await store.list<TestCodeRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.testPlanId === entry.testPlanId).length + 1;

  const record: TestCodeRecord = {
    id: generateId("test-code"),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listTestCodes(store: CollectionStore = getDefaultStore()): Promise<TestCodeRecord[]> {
  const records = await store.list<TestCodeRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getTestCode(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<TestCodeRecord | null> {
  const records = await store.list<TestCodeRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Test Plan에서 생성된 Test Code만(최신순). */
export async function listTestCodesForTestPlan(
  testPlanId: string,
  store: CollectionStore = getDefaultStore()
): Promise<TestCodeRecord[]> {
  const records = await listTestCodes(store);
  return records.filter((record) => record.testPlanId === testPlanId);
}

/**
 * 특정 Design Plan에서 생성된 가장 최근 Test Code(없으면 null). Website Build가 Review 기반
 * 체인과 이 Plan 기반 체인을 연결할 때 사용한다(database-code.ts의
 * getLatestDatabaseCodeForPlan()과 동일한 원칙).
 */
export async function getLatestTestCodeForPlan(
  planId: string,
  store: CollectionStore = getDefaultStore()
): Promise<TestCodeRecord | null> {
  const records = await listTestCodes(store);
  return records.find((record) => record.planId === planId) ?? null;
}
