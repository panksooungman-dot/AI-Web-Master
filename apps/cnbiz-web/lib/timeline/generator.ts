import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import { extractJsonPayload } from "@/lib/ai/json";
import type {
  TimelineInput,
  TimelineJudgment,
  TimelineMilestone,
  TimelinePhase,
  TimelineResult,
  TimelineWeek,
} from "./types";

const SYSTEM_PROMPT =
  "You are a senior project manager for AI Business OS. Given a project's detected business type, " +
  "requirements, page count, feature count, development scope, and a rough technical-estimate " +
  "timeline (in weeks), produce a single JSON object with exactly these keys: overview, " +
  "totalDurationWeeks, totalDurationDays, phases, milestones, weeklyPlan, assumptions. Respond with " +
  "ONLY that JSON object — no prose before or after it, no markdown code fences, no explanations. " +
  "Your entire response must be valid JSON parseable by JSON.parse(), with no trailing commas and no " +
  "comments. Do not invent requirements the input does not support.";

function buildTimelinePrompt(input: TimelineInput): string {
  return `회사명: ${input.companyName}
업종: ${input.detectedBusinessType}
페이지 수: ${input.pageCount}
기능 수: ${input.featureCount}
개발 범위: ${input.scopeIncluded.join(", ") || "(없음)"}
기술 견적서 예상 소요 기간: ${input.estimateTimelineWeeks}주
요구사항:
${input.requirements || "(내용 없음)"}

Return ONLY a JSON object shaped like:
{
  "overview": string (한국어 2~3문장 — 전체 프로젝트 기간·프로젝트 시작·종료 시점 설명),
  "totalDurationWeeks": number,
  "totalDurationDays": number,
  "phases": [{ "name": string, "description": string, "durationDays": number, "startOffsetDays": number }] (기획/디자인/Frontend/Backend/QA/Deploy/고객 검수 순서),
  "milestones": [{ "name": string, "description": string, "dueOffsetDays": number }] (요구사항 완료/디자인 완료/개발 완료/QA 완료/배포 완료),
  "weeklyPlan": [{ "weekNumber": number, "focus": string, "tasks": string[] }] (Week 1부터 순서대로),
  "assumptions": string[]
}`;
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

function isTimelinePhaseArray(value: unknown): value is TimelinePhase[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isNonEmptyString((item as Record<string, unknown>).name) &&
        typeof (item as Record<string, unknown>).description === "string" &&
        isFiniteNumber((item as Record<string, unknown>).durationDays) &&
        isFiniteNumber((item as Record<string, unknown>).startOffsetDays)
    )
  );
}

function isTimelineMilestoneArray(value: unknown): value is TimelineMilestone[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isNonEmptyString((item as Record<string, unknown>).name) &&
        typeof (item as Record<string, unknown>).description === "string" &&
        isFiniteNumber((item as Record<string, unknown>).dueOffsetDays)
    )
  );
}

function isTimelineWeekArray(value: unknown): value is TimelineWeek[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isFiniteNumber((item as Record<string, unknown>).weekNumber) &&
        isNonEmptyString((item as Record<string, unknown>).focus) &&
        isStringArray((item as Record<string, unknown>).tasks)
    )
  );
}

/**
 * AI 응답을 TimelineJudgment로 파싱한다. 형태가 조금이라도 어긋나면 null을 반환해 호출자가
 * 결정론적 기본값으로 폴백하도록 한다(lib/estimates/generator.ts의 parseAiEstimate()와 동일한
 * all-or-nothing 검증 원칙).
 */
function parseAiTimeline(raw: string): TimelineJudgment | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonPayload(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (
    !isNonEmptyString(obj.overview) ||
    !isFiniteNumber(obj.totalDurationWeeks) ||
    !isFiniteNumber(obj.totalDurationDays) ||
    !isTimelinePhaseArray(obj.phases) ||
    obj.phases.length === 0 ||
    !isTimelineMilestoneArray(obj.milestones) ||
    obj.milestones.length === 0 ||
    !isTimelineWeekArray(obj.weeklyPlan) ||
    obj.weeklyPlan.length === 0 ||
    !isStringArray(obj.assumptions)
  ) {
    return null;
  }

  return {
    overview: obj.overview,
    totalDurationWeeks: Math.max(1, Math.round(obj.totalDurationWeeks)),
    totalDurationDays: Math.max(1, Math.round(obj.totalDurationDays)),
    phases: obj.phases,
    milestones: obj.milestones,
    weeklyPlan: obj.weeklyPlan,
    assumptions: obj.assumptions,
  };
}

const PLANNING_DAYS = 3;
const DESIGN_BASE_DAYS = 4;
const DESIGN_DAYS_PER_PAGE = 1;
const FRONTEND_BASE_DAYS = 5;
const FRONTEND_DAYS_PER_PAGE = 1;
const BACKEND_BASE_DAYS = 3;
const BACKEND_DAYS_PER_FEATURE = 2;
const QA_DAYS = 4;
const DEPLOY_DAYS = 2;
const CUSTOMER_REVIEW_DAYS = 3;
const DAYS_PER_WEEK = 7;

/** 특정 주(week)에 실제로 진행 중인 Phase들을 겹치는 구간 기준으로 찾는다. */
function findActivePhases(phases: TimelinePhase[], weekNumber: number): TimelinePhase[] {
  const windowStart = (weekNumber - 1) * DAYS_PER_WEEK;
  const windowEnd = weekNumber * DAYS_PER_WEEK;

  return phases.filter((phase) => {
    const phaseStart = phase.startOffsetDays;
    const phaseEnd = phase.startOffsetDays + phase.durationDays;
    return phaseStart < windowEnd && phaseEnd > windowStart;
  });
}

function buildWeeklyPlan(phases: TimelinePhase[], totalDurationDays: number): TimelineWeek[] {
  const totalWeeks = Math.max(1, Math.ceil(totalDurationDays / DAYS_PER_WEEK));
  const weeks: TimelineWeek[] = [];

  for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber += 1) {
    const active = findActivePhases(phases, weekNumber);
    const focus = active.length > 0 ? active.map((phase) => phase.name).join(" · ") : "마무리";
    const tasks = active.length > 0 ? active.map((phase) => phase.description) : ["최종 점검 및 인수인계"];

    weeks.push({ weekNumber, focus, tasks });
  }

  return weeks;
}

/**
 * Provider 미설정이거나 응답 파싱에 실패해도 항상 유효한 일정을 내는 결정론적 폴백
 * (lib/estimates/generator.ts의 buildDefaultEstimate()와 동일한 역할). Feature Specification의
 * 페이지·기능 개수를 그대로 Phase 기간 산정에 사용한다 — Estimate/Specification과 마찬가지로
 * AI 판단 여부와 무관하게 항상 설명 가능한 규칙 기반 계산이다.
 */
function buildDefaultTimeline(input: TimelineInput): TimelineJudgment {
  const designDays = DESIGN_BASE_DAYS + input.pageCount * DESIGN_DAYS_PER_PAGE;
  const frontendDays = FRONTEND_BASE_DAYS + input.pageCount * FRONTEND_DAYS_PER_PAGE;
  const backendDays = BACKEND_BASE_DAYS + input.featureCount * BACKEND_DAYS_PER_FEATURE;

  let offset = 0;
  const buildPhase = (name: string, description: string, durationDays: number): TimelinePhase => {
    const phase: TimelinePhase = { name, description, durationDays, startOffsetDays: offset };
    offset += durationDays;
    return phase;
  };

  const phases: TimelinePhase[] = [
    buildPhase("기획", "요구사항 확정 및 프로젝트 계획 수립", PLANNING_DAYS),
    buildPhase("디자인", "화면 디자인 및 시안 확정", designDays),
    buildPhase("Frontend", "화면 퍼블리싱 및 클라이언트 로직 구현", frontendDays),
    buildPhase("Backend", "API·데이터베이스 구현", backendDays),
    buildPhase("QA", "품질 검수 및 버그 수정", QA_DAYS),
    buildPhase("Deploy", "운영 환경 배포", DEPLOY_DAYS),
    buildPhase("고객 검수", "고객 확인 및 최종 인수", CUSTOMER_REVIEW_DAYS),
  ];

  const totalDurationDays = offset;
  const totalDurationWeeks = Math.max(1, Math.ceil(totalDurationDays / DAYS_PER_WEEK));

  const findPhase = (name: string): TimelinePhase => {
    const phase = phases.find((p) => p.name === name);
    if (!phase) throw new Error(`internal: phase "${name}" not found`);
    return phase;
  };

  const milestones: TimelineMilestone[] = [
    {
      name: "요구사항 완료",
      description: "요구사항 정의 및 프로젝트 계획 승인",
      dueOffsetDays: findPhase("기획").startOffsetDays + findPhase("기획").durationDays,
    },
    {
      name: "디자인 완료",
      description: "전체 화면 디자인 시안 확정",
      dueOffsetDays: findPhase("디자인").startOffsetDays + findPhase("디자인").durationDays,
    },
    {
      name: "개발 완료",
      description: "Frontend·Backend 구현 완료",
      dueOffsetDays: findPhase("Backend").startOffsetDays + findPhase("Backend").durationDays,
    },
    {
      name: "QA 완료",
      description: "품질 검수 및 주요 결함 조치 완료",
      dueOffsetDays: findPhase("QA").startOffsetDays + findPhase("QA").durationDays,
    },
    {
      name: "배포 완료",
      description: "운영 환경 배포 및 서비스 오픈",
      dueOffsetDays: findPhase("Deploy").startOffsetDays + findPhase("Deploy").durationDays,
    },
  ];

  const weeklyPlan = buildWeeklyPlan(phases, totalDurationDays);

  const overview =
    `${input.companyName}의 ${input.detectedBusinessType} 홈페이지 프로젝트는 Day 0에 기획을 시작해 ` +
    `총 ${totalDurationWeeks}주(${totalDurationDays}일) 후인 Day ${totalDurationDays}에 고객 검수를 마치고 종료됩니다. ` +
    "AI 분석 엔진이 상세 판단을 내리지 못해 기본값으로 대체된 일정입니다.";

  return {
    overview,
    totalDurationWeeks,
    totalDurationDays,
    phases,
    milestones,
    weeklyPlan,
    assumptions: [
      "제공된 페이지·기능 개수를 기준으로 산정된 개략 일정입니다.",
      "실제 일정은 상세 요구사항 확인 및 리소스 배정에 따라 조정될 수 있습니다.",
      `기술 견적서가 제시한 예상 소요 기간(${input.estimateTimelineWeeks}주)을 세부 Phase로 분해했습니다.`,
    ],
  };
}

export interface GenerateTimelineResult {
  result: TimelineResult;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn` 기본값은 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다(lib/estimates/generator.ts의 generateEstimate()와 동일 패턴).
 */
export async function generateTimeline(
  input: TimelineInput,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateTimelineResult> {
  const chatResult = await chatFn(buildTimelinePrompt(input), { system: SYSTEM_PROMPT });

  let judgment = chatResult.success && chatResult.content ? parseAiTimeline(chatResult.content) : null;
  const simulated = judgment === null;
  if (!judgment) judgment = buildDefaultTimeline(input);

  const result: TimelineResult = judgment;

  return { result, simulated, provider: chatResult.provider, model: chatResult.model };
}
