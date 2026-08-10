import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { BackendDesignRecord, BackendLogicEndpoint } from "./backend-design";
import type { TestCase, TestCaseType, TestPlanContent } from "./testplan-design";

const TEST_CASE_TYPES: TestCaseType[] = ["unit", "integration", "e2e"];

/**
 * 한 번의 chatFn 호출로 처리할 Backend Logic 항목 개수. 로직 항목 하나당 unit+integration 최소
 * 2개의 테스트 케이스가 나오므로 Backend Design의 배치 크기(10)보다 작게 잡아, 큰 Backend
 * Design(로직 수십 개)에서도 응답이 모델의 출력 토큰 상한을 넘기지 않도록 한다(2026-08-10 실
 * E2E 검증에서 63개 로직 항목으로 인한 전체 파싱 실패·전체 폴백을 재현·확인 — Backend Design과
 * 동일한 원인). 배치별로 실패해도 그 배치의 로직 항목만 폴백되어 전체가 폴백되지 않는다.
 */
const BATCH_SIZE = 8;

const DEFAULT_COVERAGE_SUMMARY =
  "AI Provider 미설정으로 생성된 기본값입니다. 각 서비스 함수의 unit 테스트와 엔드포인트별 integration 테스트만 포함합니다.";
const DEFAULT_PRIORITY_NOTES = "인증이 필요한 엔드포인트와 삭제(DELETE) 엔드포인트부터 우선 테스트하세요.";

const SYSTEM_PROMPT =
  "You are a senior QA engineer for AI Business OS's Design Automation system. You are given ONE " +
  "SLICE of a larger project's backend service logic (a subset of its endpoints' validation/" +
  "business rules and error handling) — design the test plan for JUST the logic in this slice. " +
  "Produce a single JSON object (no prose, no markdown fences) with exactly these keys: testCases, " +
  "coverageSummary, priorityNotes. Every testCase `type` must be one of exactly: " +
  TEST_CASE_TYPES.join(", ") +
  ". For EVERY logic entry given, include at least one unit test whose `target` is exactly that " +
  "entry's serviceFunction name, and at least one integration test whose `target` is exactly " +
  "\"METHOD path\" (e.g. \"POST /api/reservations\") for that entry's endpoint — these exact-match " +
  "targets are required so results from multiple slices can be merged. Only add e2e cases for " +
  "flows that clearly span multiple endpoints in this slice. `steps` must be concrete, ordered " +
  "actions, not vague descriptions. Other slices of the same project are handled by separate " +
  "calls, so do not reference logic outside this slice.";

function buildBatchUserPrompt(logic: BackendLogicEndpoint[]): string {
  return `Backend Logic (design tests for exactly these ${logic.length} entries):
${JSON.stringify(logic)}

Return ONLY a JSON object shaped like:
{
  "testCases": [{
    "id": string (e.g. "TC-001"), "title": string, "type": string, "target": string,
    "steps": string[], "expectedResult": string
  }],
  "coverageSummary": string (한국어 1문장, 이 슬라이스의 테스트 범위 요약),
  "priorityNotes": string (한국어 1문장, 이 슬라이스에서 우선순위가 높은 테스트)
}`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string");
}

function isTestCaseType(value: unknown): value is TestCaseType {
  return typeof value === "string" && (TEST_CASE_TYPES as string[]).includes(value);
}

function isTestCase(value: unknown): value is TestCase {
  if (typeof value !== "object" || value === null) return false;
  const testCase = value as Record<string, unknown>;
  return (
    isNonEmptyString(testCase.id) &&
    isNonEmptyString(testCase.title) &&
    isTestCaseType(testCase.type) &&
    isNonEmptyString(testCase.target) &&
    isNonEmptyStringArray(testCase.steps) &&
    isNonEmptyString(testCase.expectedResult)
  );
}

/**
 * AI 응답(배치 하나 분량)을 TestPlanContent로 파싱한다. 하나라도 어긋나면 null을 반환해 호출자가
 * 그 배치 전체를 결정론적 기본값으로 폴백하도록 한다(all-or-nothing 원칙은 배치 단위로 적용됨).
 */
export function parseTestPlanContent(raw: string): TestPlanContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.testCases) || obj.testCases.length === 0 || !obj.testCases.every(isTestCase)) return null;
  if (!isNonEmptyString(obj.coverageSummary)) return null;
  if (!isNonEmptyString(obj.priorityNotes)) return null;

  return {
    testCases: obj.testCases,
    coverageSummary: obj.coverageSummary,
    priorityNotes: obj.priorityNotes,
  };
}

function formatCaseId(index: number): string {
  return `TC-${String(index + 1).padStart(3, "0")}`;
}

function integrationTarget(entry: BackendLogicEndpoint): string {
  return `${entry.method} ${entry.path}`;
}

/**
 * Backend Logic 항목 하나에 대한 결정론적 기본 테스트 케이스 쌍(unit + integration) — Provider
 * 미설정/파싱 실패 시 폴백에서도, 배치 단위 응답에서 특정 로직 항목의 커버리지가 불완전할 때의
 * 부분 보강(gap-fill)에서도 재사용된다. `id`는 자리표시자이며 최종 병합 시 순번으로 다시
 * 채번된다(배치 병렬 실행 시 서로 다른 배치가 같은 id를 반환할 수 있어 항상 재채번이 필요하다).
 */
function buildDefaultCasesForLogic(entry: BackendLogicEndpoint): [TestCase, TestCase] {
  const unitCase: TestCase = {
    id: "",
    title: `${entry.serviceFunction} 검증 규칙 확인`,
    type: "unit",
    target: entry.serviceFunction,
    steps: [
      ...entry.validationRules.map((rule) => `${rule} 조건을 위반하는 입력을 전달한다.`),
      "서비스 함수를 호출한다.",
    ],
    expectedResult: `${entry.validationRules[0] ?? "검증 규칙"}을(를) 위반하면 호출이 거부된다.`,
  };

  const integrationCase: TestCase = {
    id: "",
    title: `${integrationTarget(entry)} 요청/응답 계약 확인`,
    type: "integration",
    target: integrationTarget(entry),
    steps: [`${integrationTarget(entry)}에 유효한 요청을 보낸다.`, "응답 상태 코드와 본문을 확인한다."],
    expectedResult: `정상 요청은 성공 응답을, 검증 실패 요청은 ${entry.errorHandling[0] ?? "정의된 오류"}를 반환한다.`,
  };

  return [unitCase, integrationCase];
}

function renumber(testCases: TestCase[]): TestCase[] {
  return testCases.map((testCase, index) => ({ ...testCase, id: formatCaseId(index) }));
}

/**
 * Backend Design만으로 항상 유효한 Test Plan을 만드는 결정론적 폴백 — Provider 미설정이거나
 * 응답 파싱에 실패해도 빈 계획이 되지 않는다(buildDefaultCasesForLogic() 참고).
 */
export function buildDefaultTestPlan(backend: BackendDesignRecord): TestPlanContent {
  return {
    testCases: renumber(backend.content.logic.flatMap(buildDefaultCasesForLogic)),
    coverageSummary: DEFAULT_COVERAGE_SUMMARY,
    priorityNotes: DEFAULT_PRIORITY_NOTES,
  };
}

export interface GenerateTestPlanResult {
  content: TestPlanContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

type ChatFn = (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult>;

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

interface BatchOutcome {
  testCases: TestCase[];
  coverageSummary: string | null;
  priorityNotes: string | null;
  usedFallback: boolean;
  provider?: string;
  model?: string;
}

/**
 * Backend Logic 배치 하나를 처리한다 — AI 응답이 없거나 파싱에 실패하면 배치 전체를 폴백하고,
 * 파싱에는 성공했지만 특정 로직 항목의 unit/integration 케이스 중 하나라도 응답에서 누락된
 * 경우(정확히 target이 일치하는 케이스가 없는 경우) 그 항목만 개별 폴백한다(gap-fill).
 */
async function generateBatch(logic: BackendLogicEndpoint[], chatFn: ChatFn): Promise<BatchOutcome> {
  const result = await chatFn(buildBatchUserPrompt(logic), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parseTestPlanContent(result.content);
    if (parsed) {
      let usedFallback = false;
      const testCases: TestCase[] = [];

      for (const entry of logic) {
        const unit = parsed.testCases.find((tc) => tc.type === "unit" && tc.target === entry.serviceFunction);
        const integration = parsed.testCases.find(
          (tc) => tc.type === "integration" && tc.target === integrationTarget(entry)
        );

        if (unit && integration) {
          testCases.push(unit, integration);
        } else {
          usedFallback = true;
          testCases.push(...buildDefaultCasesForLogic(entry));
        }
      }

      return {
        testCases,
        coverageSummary: parsed.coverageSummary,
        priorityNotes: parsed.priorityNotes,
        usedFallback,
        provider: result.provider,
        model: result.model,
      };
    }
  }

  return {
    testCases: logic.flatMap(buildDefaultCasesForLogic),
    coverageSummary: null,
    priorityNotes: null,
    usedFallback: true,
  };
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백 — 단, 이제 이 all-or-nothing
 * 판단은 Backend Design의 로직 항목을 BATCH_SIZE 단위로 나눈 배치마다 독립적으로 이뤄진다(병렬
 * 실행). `chatFn`은 기본값이 실제 lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를
 * 주입해 실제 CLI 서브프로세스 없이 검증한다.
 */
export async function generateTestPlan(
  backend: BackendDesignRecord,
  chatFn: ChatFn = chatViaCli
): Promise<GenerateTestPlanResult> {
  const batches: BackendLogicEndpoint[][] = [];
  for (let i = 0; i < backend.content.logic.length; i += BATCH_SIZE) {
    batches.push(backend.content.logic.slice(i, i + BATCH_SIZE));
  }

  const outcomes = await Promise.all(batches.map((batch) => generateBatch(batch, chatFn)));

  const testCases = renumber(outcomes.flatMap((o) => o.testCases));
  const summaries = dedupe(outcomes.map((o) => o.coverageSummary).filter((s): s is string => Boolean(s)));
  const priorities = dedupe(outcomes.map((o) => o.priorityNotes).filter((s): s is string => Boolean(s)));
  const simulated = outcomes.some((o) => o.usedFallback);
  const firstSuccess = outcomes.find((o) => !o.usedFallback && o.provider);

  return {
    content: {
      testCases,
      coverageSummary: summaries.length > 0 ? summaries.join(" ") : DEFAULT_COVERAGE_SUMMARY,
      priorityNotes: priorities.length > 0 ? priorities.join(" ") : DEFAULT_PRIORITY_NOTES,
    },
    simulated,
    provider: firstSuccess?.provider,
    model: firstSuccess?.model,
  };
}
