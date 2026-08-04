import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type {
  ProposalCost,
  ProposalFeature,
  ProposalInput,
  ProposalJudgment,
  ProposalPage,
  ProposalResult,
} from "./types";

const SYSTEM_PROMPT =
  "You are a senior proposal writer for AI Business OS. Given a project's detected business type, " +
  "requirements, pages, features, tech stack, development scope, deliverables, price range, total " +
  "duration, milestones, and contract amount, produce a single JSON object (no prose, no markdown " +
  "fences) with exactly these keys: title, executiveSummary, overview, requirementsAnalysis, " +
  "objectives, solutionOverview, pages, features, techStack, schedule, cost, developmentScope, " +
  "deliverables, maintenancePlan, expectedBenefits, companyIntroduction, contactInfo. Prices are in " +
  "Korean Won(KRW). Do not invent facts the input does not support.";

function buildProposalPrompt(input: ProposalInput): string {
  return `회사명: ${input.companyName}
업종: ${input.detectedBusinessType}
페이지: ${input.pageNames.join(", ") || "(없음)"}
기능: ${input.featureNames.join(", ") || "(없음)"}
기술 스택: ${input.techStack.join(", ") || "(없음)"}
개발 범위: ${input.scopeIncluded.join(", ") || "(없음)"}
산출물: ${input.deliverables.join(", ") || "(없음)"}
견적 가격 범위: ${input.priceRangeMin.toLocaleString()} ~ ${input.priceRangeMax.toLocaleString()}${input.currency}
계약 금액: ${input.contractAmount.toLocaleString()}${input.currency}
전체 개발 기간: ${input.totalDurationWeeks}주 (${input.totalDurationDays}일)
Milestone: ${input.milestoneNames.join(", ") || "(없음)"}
계약서상 유지보수 조항 요약: ${input.maintenanceSummary || "(없음)"}
요구사항:
${input.requirements || "(내용 없음)"}

Return ONLY a JSON object shaped like:
{
  "title": string (제안서 제목),
  "executiveSummary": string (한국어 2~3문장 Executive Summary),
  "overview": string (프로젝트 개요),
  "requirementsAnalysis": string (고객 요구사항 분석),
  "objectives": string[] (제안 목표),
  "solutionOverview": string (솔루션 개요),
  "pages": [{ "name": string, "description": string }] (페이지 구성),
  "features": [{ "name": string, "description": string }] (주요 기능),
  "techStack": string[],
  "schedule": string (프로젝트 일정 서술),
  "cost": { "amount": number (KRW), "currency": "KRW", "description": string },
  "developmentScope": string[] (개발 범위),
  "deliverables": string[] (산출물),
  "maintenancePlan": string (유지보수 계획),
  "expectedBenefits": string[] (프로젝트 기대 효과),
  "companyIntroduction": string (회사 소개),
  "contactInfo": string (문의 정보)
}`;
}

/** ```json ... ``` 코드펜스로 감싸서 응답하는 모델 습관을 방어적으로 벗겨낸다(lib/estimates/generator.ts와 동일). */
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

function isNonEmptyStringArray(value: unknown): value is string[] {
  return isStringArray(value) && value.length > 0;
}

function isProposalPageArray(value: unknown): value is ProposalPage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isNonEmptyString((item as Record<string, unknown>).name) &&
        typeof (item as Record<string, unknown>).description === "string"
    )
  );
}

function isProposalFeatureArray(value: unknown): value is ProposalFeature[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isNonEmptyString((item as Record<string, unknown>).name) &&
        typeof (item as Record<string, unknown>).description === "string"
    )
  );
}

function isProposalCost(value: unknown): value is ProposalCost {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    isFiniteNumber(obj.amount) &&
    obj.amount >= 0 &&
    isNonEmptyString(obj.currency) &&
    typeof obj.description === "string"
  );
}

/**
 * AI 응답을 ProposalJudgment로 파싱한다. 형태가 조금이라도 어긋나면 null을 반환해 호출자가
 * 결정론적 기본값으로 폴백하도록 한다(lib/estimates/generator.ts의 parseAiEstimate()와 동일한
 * all-or-nothing 검증 원칙).
 */
function parseAiProposal(raw: string): ProposalJudgment | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (
    !isNonEmptyString(obj.title) ||
    !isNonEmptyString(obj.executiveSummary) ||
    !isNonEmptyString(obj.overview) ||
    !isNonEmptyString(obj.requirementsAnalysis) ||
    !isNonEmptyStringArray(obj.objectives) ||
    !isNonEmptyString(obj.solutionOverview) ||
    !isProposalPageArray(obj.pages) ||
    !isProposalFeatureArray(obj.features) ||
    !isNonEmptyStringArray(obj.techStack) ||
    !isNonEmptyString(obj.schedule) ||
    !isProposalCost(obj.cost) ||
    !isNonEmptyStringArray(obj.developmentScope) ||
    !isNonEmptyStringArray(obj.deliverables) ||
    !isNonEmptyString(obj.maintenancePlan) ||
    !isNonEmptyStringArray(obj.expectedBenefits) ||
    !isNonEmptyString(obj.companyIntroduction) ||
    !isNonEmptyString(obj.contactInfo)
  ) {
    return null;
  }

  return {
    title: obj.title,
    executiveSummary: obj.executiveSummary,
    overview: obj.overview,
    requirementsAnalysis: obj.requirementsAnalysis,
    objectives: obj.objectives,
    solutionOverview: obj.solutionOverview,
    pages: obj.pages,
    features: obj.features,
    techStack: obj.techStack,
    schedule: obj.schedule,
    cost: obj.cost,
    developmentScope: obj.developmentScope,
    deliverables: obj.deliverables,
    maintenancePlan: obj.maintenancePlan,
    expectedBenefits: obj.expectedBenefits,
    companyIntroduction: obj.companyIntroduction,
    contactInfo: obj.contactInfo,
  };
}

const DEFAULT_PAGE_NAME = "Home";
const DEFAULT_FEATURE_NAME = "문의하기";
/** apps/cnbiz-web의 실제 공개 브랜드 카피(Footer 태그라인) — 지어낸 문구가 아니다. */
const COMPANY_INTRODUCTION =
  "CNBIZ는 디지털 혁신으로 비즈니스의 미래를 함께 만드는 것을 목표로 하는 AI 기반 웹 개발사입니다. " +
  "AI Business OS를 통해 상담부터 견적·설계·개발·배포까지 이어지는 자동화된 개발 프로세스를 운영합니다.";
/** 연락처 정보는 이 저장소에서 아직 확정되지 않은 사실(TODO)이므로 지어내지 않는다. */
const CONTACT_INFO = "본 제안서에 대한 문의는 CNBIZ 담당자에게 연락 바랍니다. 상세 연락처는 별도 확인 후 안내드립니다.";

/**
 * Provider 미설정이거나 응답 파싱에 실패해도 항상 유효한 제안서를 내는 결정론적 폴백
 * (lib/estimates/generator.ts의 buildDefaultEstimate()와 동일한 역할). Specification의 페이지·
 * 기능·기술 스택·범위·산출물, Estimate의 가격, Timeline의 기간·Milestone, Contract의 계약
 * 금액·유지보수 조항을 그대로 제안서 항목으로 옮긴다 — AI 판단 여부와 무관하게 항상 설명
 * 가능한 규칙 기반 계산이다.
 */
function buildDefaultProposal(input: ProposalInput): ProposalJudgment {
  const pageNames = input.pageNames.length > 0 ? input.pageNames : [DEFAULT_PAGE_NAME];
  const featureNames = input.featureNames.length > 0 ? input.featureNames : [DEFAULT_FEATURE_NAME];

  const pages: ProposalPage[] = pageNames.map((name) => ({
    name,
    description: `${name} 페이지 구성 및 콘텐츠 배치`,
  }));

  const features: ProposalFeature[] = featureNames.map((name) => ({
    name,
    description: `${name} 기능 제공`,
  }));

  const techStack = input.techStack.length > 0 ? input.techStack : ["Next.js (App Router)", "TypeScript", "Tailwind CSS"];
  const developmentScope = input.scopeIncluded.length > 0 ? input.scopeIncluded : [`${pages.length}개 페이지 개발`];
  const deliverables = input.deliverables.length > 0 ? input.deliverables : ["배포된 웹사이트(프로덕션 URL)", "소스코드 저장소"];

  const milestoneClause =
    input.milestoneNames.length > 0 ? ` 세부 일정은 ${input.milestoneNames.join(" → ")} 순서로 진행됩니다.` : "";
  const schedule = `본 프로젝트는 착수일로부터 총 ${input.totalDurationWeeks}주(${input.totalDurationDays}일)간 진행됩니다.${milestoneClause}`;

  const cost: ProposalCost = {
    amount: input.contractAmount,
    currency: input.currency,
    description: `견적 산정 범위(${input.priceRangeMin.toLocaleString()} ~ ${input.priceRangeMax.toLocaleString()}${input.currency}) 내에서 계약서 기준으로 확정된 금액입니다.`,
  };

  const objectives = [
    `${input.detectedBusinessType} 업종에 최적화된 홈페이지 구축`,
    "온라인 채널을 통한 고객 문의·전환 경로 확보",
    "반응형 웹으로 모바일·데스크탑 전 기기 대응",
  ];

  const expectedBenefits = [
    "전문적인 온라인 브랜드 이미지 구축",
    "24시간 상시 노출을 통한 잠재 고객 확보",
    "체계적인 문의 관리로 응대 효율성 향상",
  ];

  const overview =
    `${input.companyName}의 ${input.detectedBusinessType} 홈페이지 제작 프로젝트 제안서입니다. ` +
    `페이지 ${pages.length}종, 기능 ${features.length}종을 기준으로 작성했습니다.`;

  const executiveSummary =
    `${input.companyName}에 ${input.detectedBusinessType} 특화 홈페이지를 ${input.totalDurationWeeks}주 내 구축하는 제안입니다. ` +
    `총 계약 금액은 ${cost.amount.toLocaleString()}${cost.currency}이며, 견적·설계·개발·배포 전 과정을 포함합니다. ` +
    "AI 분석 엔진이 상세 판단을 내리지 못해 기본값으로 대체된 제안서입니다.";

  return {
    title: `${input.companyName} 홈페이지 구축 제안서`,
    executiveSummary,
    overview,
    requirementsAnalysis:
      input.requirements.trim().length > 0
        ? `고객이 제시한 요구사항("${input.requirements}")을 검토한 결과, ${input.detectedBusinessType} 업종에 적합한 정보 구조와 기능 구성이 필요한 것으로 분석되었습니다.`
        : `별도로 제시된 요구사항이 없어, ${input.detectedBusinessType} 업종의 표준적인 홈페이지 구성을 기준으로 분석했습니다.`,
    objectives,
    solutionOverview: `AI Business OS의 표준 개발 프로세스(${techStack.join(", ")} 기반)를 활용해 페이지 ${pages.length}종과 기능 ${features.length}종을 구현하는 것을 제안합니다.`,
    pages,
    features,
    techStack,
    schedule,
    cost,
    developmentScope,
    deliverables,
    maintenancePlan:
      input.maintenanceSummary.trim().length > 0
        ? input.maintenanceSummary
        : "배포 후 30일간 무상 하자보수를 제공하며, 이후 유지보수가 필요한 경우 별도 협의를 통해 계약을 체결할 수 있습니다.",
    expectedBenefits,
    companyIntroduction: COMPANY_INTRODUCTION,
    contactInfo: CONTACT_INFO,
  };
}

export interface GenerateProposalResult {
  result: ProposalResult;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn` 기본값은 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다(lib/estimates/generator.ts의 generateEstimate()와 동일 패턴).
 */
export async function generateProposal(
  input: ProposalInput,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateProposalResult> {
  const chatResult = await chatFn(buildProposalPrompt(input), { system: SYSTEM_PROMPT });

  let judgment = chatResult.success && chatResult.content ? parseAiProposal(chatResult.content) : null;
  const simulated = judgment === null;
  if (!judgment) judgment = buildDefaultProposal(input);

  const result: ProposalResult = judgment;

  return { result, simulated, provider: chatResult.provider, model: chatResult.model };
}
