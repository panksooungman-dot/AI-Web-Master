import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type {
  EstimateLineItem,
  FunctionalSpecification,
  PlanningContent,
  PlanningInput,
  ProjectTimeline,
  SpecFunction,
  SpecPage,
  SpecPriority,
  TechnicalEstimate,
  TimelinePhase,
} from "./types";

const SYSTEM_PROMPT =
  "You are a senior project planner for AI Business OS's Planning phase (Phase 3), building on top " +
  "of the existing AI Analysis Engine's output. Given a business's detected type, recommended pages/" +
  "functions, and consultation summary, produce a single JSON object (no prose, no markdown fences) " +
  "with exactly these keys: specification, estimate, timeline. Prices are in KRW. Do not invent facts " +
  "the input does not support — base every page/function on the input's recommendedPages/recommendedFunctions.";

function buildUserPrompt(input: PlanningInput): string {
  return `회사명: ${input.companyName || "(미상)"}
사이트 유형: ${input.siteType || "(미상)"}
업종(AI Analysis 판단): ${input.analysis.detectedBusinessType}
상담 내용:
${input.requirements || "(내용 없음)"}

AI Analysis 요약: ${input.analysis.summary}
추천 페이지: ${input.analysis.recommendedPages.join(", ") || "(없음)"}
추천 기능: ${input.analysis.recommendedFunctions.join(", ") || "(없음)"}
완성도: ${input.analysis.completeness}/100

Return ONLY a JSON object shaped like:
{
  "specification": {
    "overview": string (2~3문장 한국어 프로젝트 개요),
    "pages": [{ "name": string, "description": string }] (input의 recommendedPages 기반),
    "functions": [{ "name": string, "description": string, "priority": "High"|"Medium"|"Low" }] (input의 recommendedFunctions 기반)
  },
  "estimate": {
    "currency": "KRW",
    "lineItems": [{ "name": string, "description": string, "unitPrice": number, "quantity": number, "amount": number }],
    "subtotal": number,
    "contingency": number,
    "total": number,
    "assumptions": string[]
  },
  "timeline": {
    "phases": [{ "name": string, "description": string, "durationDays": number, "startOffsetDays": number }],
    "totalDurationDays": number
  }
}`;
}

/** ```json ... ``` 코드펜스로 감싸서 응답하는 모델 습관을 방어적으로 벗겨낸다(lib/design/generator.ts와 동일). */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSpecPage(value: unknown): value is SpecPage {
  if (typeof value !== "object" || value === null) return false;
  const page = value as Record<string, unknown>;
  return isNonEmptyString(page.name) && typeof page.description === "string";
}

function isSpecPriority(value: unknown): value is SpecPriority {
  return value === "High" || value === "Medium" || value === "Low";
}

function isSpecFunction(value: unknown): value is SpecFunction {
  if (typeof value !== "object" || value === null) return false;
  const fn = value as Record<string, unknown>;
  return isNonEmptyString(fn.name) && typeof fn.description === "string" && isSpecPriority(fn.priority);
}

function isFunctionalSpecification(value: unknown): value is FunctionalSpecification {
  if (typeof value !== "object" || value === null) return false;
  const spec = value as Record<string, unknown>;
  return (
    isNonEmptyString(spec.overview) &&
    Array.isArray(spec.pages) &&
    spec.pages.every(isSpecPage) &&
    Array.isArray(spec.functions) &&
    spec.functions.every(isSpecFunction)
  );
}

function isEstimateLineItem(value: unknown): value is EstimateLineItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isNonEmptyString(item.name) &&
    typeof item.description === "string" &&
    isFiniteNumber(item.unitPrice) &&
    isFiniteNumber(item.quantity) &&
    isFiniteNumber(item.amount)
  );
}

function isTechnicalEstimate(value: unknown): value is TechnicalEstimate {
  if (typeof value !== "object" || value === null) return false;
  const estimate = value as Record<string, unknown>;
  return (
    isNonEmptyString(estimate.currency) &&
    Array.isArray(estimate.lineItems) &&
    estimate.lineItems.every(isEstimateLineItem) &&
    isFiniteNumber(estimate.subtotal) &&
    isFiniteNumber(estimate.contingency) &&
    isFiniteNumber(estimate.total) &&
    isStringArray(estimate.assumptions)
  );
}

function isTimelinePhase(value: unknown): value is TimelinePhase {
  if (typeof value !== "object" || value === null) return false;
  const phase = value as Record<string, unknown>;
  return (
    isNonEmptyString(phase.name) &&
    typeof phase.description === "string" &&
    isFiniteNumber(phase.durationDays) &&
    isFiniteNumber(phase.startOffsetDays)
  );
}

function isProjectTimeline(value: unknown): value is ProjectTimeline {
  if (typeof value !== "object" || value === null) return false;
  const timeline = value as Record<string, unknown>;
  return (
    Array.isArray(timeline.phases) &&
    timeline.phases.every(isTimelinePhase) &&
    isFiniteNumber(timeline.totalDurationDays)
  );
}

/**
 * AI 응답을 PlanningContent로 파싱한다. 하나라도 어긋나면 null을 반환해 호출자가 결정론적
 * 기본값으로 폴백하도록 한다(lib/design/generator.ts의 parseDesignPlanContent()와 동일한
 * all-or-nothing 검증 원칙 — 견적·일정처럼 숫자가 포함된 문서일수록 절반만 유효한 응답을
 * 그대로 쓰지 않는 것이 더 중요하다).
 */
export function parsePlanningContent(raw: string): PlanningContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (!isFunctionalSpecification(obj.specification)) return null;
  if (!isTechnicalEstimate(obj.estimate)) return null;
  if (!isProjectTimeline(obj.timeline)) return null;

  return {
    specification: obj.specification,
    estimate: obj.estimate,
    timeline: obj.timeline,
  };
}

const DEFAULT_PAGES = ["Home", "About", "Service", "Contact"];
const DEFAULT_FUNCTIONS = ["Inquiry"];

const PAGE_UNIT_PRICE = 500_000;
const FUNCTION_UNIT_PRICE = 800_000;
const BASE_PACKAGE_PRICE = 3_000_000;
const CONTINGENCY_RATE = 0.1;

const PAGE_DURATION_DAYS = 1;
const FUNCTION_DURATION_DAYS = 2;
const BASE_PLANNING_DAYS = 5;
const BASE_DESIGN_DAYS = 7;
const BASE_DEV_DAYS = 10;
const BASE_QA_DAYS = 5;
const BASE_DEPLOY_DAYS = 3;

/**
 * 입력(AIAnalysisResult의 recommendedPages/recommendedFunctions)만으로 항상 유효한 3종 문서를
 * 만드는 결정론적 폴백 — Provider 미설정이거나 응답 파싱에 실패해도 Planning 화면이 절대 빈
 * 상태가 되지 않는다(lib/design/generator.ts의 buildDefaultDesignPlan()과 동일한 역할). 견적·
 * 일정은 페이지/기능 개수 기반의 규칙(rule-based) 계산이라, AI 판단 여부와 무관하게 항상
 * 설명 가능하다(lib/ai-analysis/score.ts의 "규칙 기반 계산은 항상 신뢰 가능" 원칙과 동일한 사고).
 */
export function buildDefaultPlanning(input: PlanningInput): PlanningContent {
  const pageNames = input.analysis.recommendedPages.length > 0 ? input.analysis.recommendedPages : DEFAULT_PAGES;
  const functionNames =
    input.analysis.recommendedFunctions.length > 0 ? input.analysis.recommendedFunctions : DEFAULT_FUNCTIONS;

  const pages: SpecPage[] = pageNames.map((name) => ({ name, description: `${name} 페이지` }));
  const functions: SpecFunction[] = functionNames.map((name) => ({
    name,
    description: `${name} 기능`,
    priority: "Medium",
  }));

  const specification: FunctionalSpecification = {
    overview: input.analysis.summary || `${input.companyName || "고객사"}의 홈페이지 제작 프로젝트입니다.`,
    pages,
    functions,
  };

  const lineItems: EstimateLineItem[] = [
    {
      name: "기본 패키지",
      description: "홈페이지 기본 구조·디자인 시스템·배포 환경 구성",
      unitPrice: BASE_PACKAGE_PRICE,
      quantity: 1,
      amount: BASE_PACKAGE_PRICE,
    },
    {
      name: "페이지 제작",
      description: `${pages.length}개 페이지 (${pages.map((p) => p.name).join(", ")})`,
      unitPrice: PAGE_UNIT_PRICE,
      quantity: pages.length,
      amount: PAGE_UNIT_PRICE * pages.length,
    },
    {
      name: "기능 개발",
      description: `${functions.length}개 기능 (${functions.map((f) => f.name).join(", ")})`,
      unitPrice: FUNCTION_UNIT_PRICE,
      quantity: functions.length,
      amount: FUNCTION_UNIT_PRICE * functions.length,
    },
  ];
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const contingency = Math.round(subtotal * CONTINGENCY_RATE);
  const total = subtotal + contingency;

  const estimate: TechnicalEstimate = {
    currency: "KRW",
    lineItems,
    subtotal,
    contingency,
    total,
    assumptions: [
      "1회 디자인 시안 확정 및 2회 이내 수정을 기준으로 한다.",
      "콘텐츠(텍스트·이미지)는 고객이 제공하는 것을 기준으로 한다.",
      "제3자 유료 API·라이선스 비용은 별도다.",
    ],
  };

  const devDays = BASE_DEV_DAYS + functions.length * FUNCTION_DURATION_DAYS;
  const designDays = BASE_DESIGN_DAYS + pages.length * PAGE_DURATION_DAYS;

  let offset = 0;
  const buildPhase = (name: string, description: string, durationDays: number): TimelinePhase => {
    const phase: TimelinePhase = { name, description, durationDays, startOffsetDays: offset };
    offset += durationDays;
    return phase;
  };

  const phases: TimelinePhase[] = [
    buildPhase("기획", "요구사항 확정 및 정보 구조 설계", BASE_PLANNING_DAYS),
    buildPhase("디자인", "화면 디자인 및 시안 확정", designDays),
    buildPhase("개발", "페이지·기능 구현", devDays),
    buildPhase("테스트", "QA 및 고객 검수", BASE_QA_DAYS),
    buildPhase("배포", "운영 환경 배포 및 최종 점검", BASE_DEPLOY_DAYS),
  ];

  const timeline: ProjectTimeline = {
    phases,
    totalDurationDays: phases.reduce((sum, phase) => sum + phase.durationDays, 0),
  };

  return { specification, estimate, timeline };
}

export interface GeneratePlanningResult {
  content: PlanningContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn` 기본값은 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다(lib/design/generator.ts의 generateDesignPlan()과 동일 패턴).
 */
export async function generatePlanning(
  input: PlanningInput,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GeneratePlanningResult> {
  const result = await chatFn(buildUserPrompt(input), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parsePlanningContent(result.content);
    if (parsed) {
      return { content: parsed, simulated: false, provider: result.provider, model: result.model };
    }
  }

  return { content: buildDefaultPlanning(input), simulated: true };
}
