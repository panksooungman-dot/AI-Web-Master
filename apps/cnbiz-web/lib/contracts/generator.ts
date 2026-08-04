import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import { extractJsonPayload } from "@/lib/ai/json";
import type { ContractAmount, ContractInput, ContractJudgment, ContractResult } from "./types";

const SYSTEM_PROMPT =
  "You are a senior contract drafter for AI Business OS. Given a project's detected business type, " +
  "requirements, development scope, excluded scope, deliverables, price range, total duration, and " +
  "milestones, produce a single JSON object with exactly these keys: title, overview, purpose, " +
  "developmentScope, excludedScope, schedule, contractAmount, paymentTerms, deliverables, " +
  "acceptanceCriteria, maintenance, changeRequestPolicy, terminationClause, intellectualProperty, " +
  "confidentiality, specialTerms. Respond with ONLY that JSON object — no prose before or after it, " +
  "no markdown code fences, no explanations. Your entire response must be valid JSON parseable by " +
  "JSON.parse(), with no trailing commas and no comments. Prices are in Korean Won(KRW). Do not " +
  "invent facts the input does not support.";

function buildContractPrompt(input: ContractInput): string {
  return `회사명: ${input.companyName}
업종: ${input.detectedBusinessType}
개발 범위: ${input.scopeIncluded.join(", ") || "(없음)"}
제외 범위: ${input.scopeExcluded.join(", ") || "(없음)"}
산출물: ${input.deliverables.join(", ") || "(없음)"}
견적 가격 범위: ${input.priceRangeMin.toLocaleString()} ~ ${input.priceRangeMax.toLocaleString()}원
전체 개발 기간: ${input.totalDurationWeeks}주 (${input.totalDurationDays}일)
Milestone: ${input.milestoneNames.join(", ") || "(없음)"}
요구사항:
${input.requirements || "(내용 없음)"}

Return ONLY a JSON object shaped like:
{
  "title": string (계약 제목),
  "overview": string (한국어 2~3문장 프로젝트 개요),
  "purpose": string (계약 목적),
  "developmentScope": string[] (개발 범위),
  "excludedScope": string[] (제외 범위),
  "schedule": string (개발 일정 조항),
  "contractAmount": { "amount": number (KRW), "currency": "KRW", "vatIncluded": boolean },
  "paymentTerms": string[] (결제 조건),
  "deliverables": string[] (산출물),
  "acceptanceCriteria": string[] (검수 조건),
  "maintenance": string (유지보수 조항),
  "changeRequestPolicy": string (변경 요청 규정),
  "terminationClause": string (계약 해지 조건),
  "intellectualProperty": string (저작권 조항),
  "confidentiality": string (비밀유지 조항),
  "specialTerms": string[] (기타 특약, 없으면 빈 배열)
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

function isNonEmptyStringArray(value: unknown): value is string[] {
  return isStringArray(value) && value.length > 0;
}

function isContractAmount(value: unknown): value is ContractAmount {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    isFiniteNumber(obj.amount) &&
    obj.amount >= 0 &&
    isNonEmptyString(obj.currency) &&
    typeof obj.vatIncluded === "boolean"
  );
}

/**
 * AI 응답을 ContractJudgment로 파싱한다. 형태가 조금이라도 어긋나면 null을 반환해 호출자가
 * 결정론적 기본값으로 폴백하도록 한다(lib/estimates/generator.ts의 parseAiEstimate()와 동일한
 * all-or-nothing 검증 원칙).
 */
function parseAiContract(raw: string): ContractJudgment | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonPayload(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (
    !isNonEmptyString(obj.title) ||
    !isNonEmptyString(obj.overview) ||
    !isNonEmptyString(obj.purpose) ||
    !isNonEmptyStringArray(obj.developmentScope) ||
    !isStringArray(obj.excludedScope) ||
    !isNonEmptyString(obj.schedule) ||
    !isContractAmount(obj.contractAmount) ||
    !isNonEmptyStringArray(obj.paymentTerms) ||
    !isNonEmptyStringArray(obj.deliverables) ||
    !isNonEmptyStringArray(obj.acceptanceCriteria) ||
    !isNonEmptyString(obj.maintenance) ||
    !isNonEmptyString(obj.changeRequestPolicy) ||
    !isNonEmptyString(obj.terminationClause) ||
    !isNonEmptyString(obj.intellectualProperty) ||
    !isNonEmptyString(obj.confidentiality) ||
    !isStringArray(obj.specialTerms)
  ) {
    return null;
  }

  return {
    title: obj.title,
    overview: obj.overview,
    purpose: obj.purpose,
    developmentScope: obj.developmentScope,
    excludedScope: obj.excludedScope,
    schedule: obj.schedule,
    contractAmount: obj.contractAmount,
    paymentTerms: obj.paymentTerms,
    deliverables: obj.deliverables,
    acceptanceCriteria: obj.acceptanceCriteria,
    maintenance: obj.maintenance,
    changeRequestPolicy: obj.changeRequestPolicy,
    terminationClause: obj.terminationClause,
    intellectualProperty: obj.intellectualProperty,
    confidentiality: obj.confidentiality,
    specialTerms: obj.specialTerms,
  };
}

const CONTRACT_PRICE_ROUNDING_KRW = 10_000;
const DOWN_PAYMENT_RATIO = 0.3;
const MIDTERM_PAYMENT_RATIO = 0.4;
const FINAL_PAYMENT_RATIO = 0.3;
const DEFAULT_SCOPE = ["홈페이지 기본 구조 및 디자인 구현"];
const DEFAULT_DELIVERABLES = ["배포된 웹사이트(프로덕션 URL)", "소스코드 저장소"];

/**
 * Provider 미설정이거나 응답 파싱에 실패해도 항상 유효한 계약서를 내는 결정론적 폴백
 * (lib/estimates/generator.ts의 buildDefaultEstimate()와 동일한 역할). Estimate의 가격 범위·
 * Timeline의 기간/Milestone·Specification의 범위/산출물을 그대로 계약 조항으로 옮긴다 — AI
 * 판단 여부와 무관하게 항상 설명 가능한 규칙 기반 계산이다.
 */
function buildDefaultContract(input: ContractInput): ContractJudgment {
  const developmentScope = input.scopeIncluded.length > 0 ? input.scopeIncluded : DEFAULT_SCOPE;
  const excludedScope = input.scopeExcluded;
  const deliverables = input.deliverables.length > 0 ? input.deliverables : DEFAULT_DELIVERABLES;

  const priceCenter = (input.priceRangeMin + input.priceRangeMax) / 2;
  const amount = Math.round(priceCenter / CONTRACT_PRICE_ROUNDING_KRW) * CONTRACT_PRICE_ROUNDING_KRW;

  const contractAmount: ContractAmount = {
    amount,
    currency: "KRW",
    vatIncluded: false,
  };

  const downPayment = Math.round((amount * DOWN_PAYMENT_RATIO) / CONTRACT_PRICE_ROUNDING_KRW) * CONTRACT_PRICE_ROUNDING_KRW;
  const midtermPayment = Math.round((amount * MIDTERM_PAYMENT_RATIO) / CONTRACT_PRICE_ROUNDING_KRW) * CONTRACT_PRICE_ROUNDING_KRW;
  const finalPayment = amount - downPayment - midtermPayment;

  const paymentTerms = [
    `계약금 ${downPayment.toLocaleString()}원(${Math.round(DOWN_PAYMENT_RATIO * 100)}%) — 계약 체결 시 지급`,
    `중도금 ${midtermPayment.toLocaleString()}원(${Math.round(MIDTERM_PAYMENT_RATIO * 100)}%) — 개발 완료 시 지급`,
    `잔금 ${finalPayment.toLocaleString()}원(${Math.round(FINAL_PAYMENT_RATIO * 100)}%) — 검수 완료 후 7일 이내 지급`,
  ];

  const acceptanceCriteria = [
    "계약서에 명시된 개발 범위와 산출물이 계약대로 이행되었는지 확인한다.",
    "갑은 검수 요청일로부터 7일 이내에 검수 결과를 서면(이메일 포함)으로 통보한다.",
    "7일 이내 통보가 없을 경우 검수가 완료된 것으로 간주한다.",
  ];

  const milestoneClause =
    input.milestoneNames.length > 0
      ? ` 세부 일정은 ${input.milestoneNames.join(" → ")} 순서의 별첨 프로젝트 일정표를 따른다.`
      : "";

  const schedule =
    `계약 체결일로부터 총 ${input.totalDurationWeeks}주(${input.totalDurationDays}일) 이내 개발을 완료한다.` +
    milestoneClause;

  const overview =
    `본 계약은 ${input.companyName}(이하 "갑")의 ${input.detectedBusinessType} 홈페이지 제작을 을이 수행하는 것을 ` +
    `내용으로 한다. 개발 범위 ${developmentScope.length}건, 산출물 ${deliverables.length}건을 기준으로 작성했다. ` +
    "AI 분석 엔진이 상세 판단을 내리지 못해 기본값으로 대체된 계약서입니다.";

  return {
    title: `${input.companyName} 홈페이지 제작 계약서`,
    overview,
    purpose: "본 계약은 갑이 을에게 홈페이지 제작을 위탁하고, 을이 이를 성실히 수행함에 있어 필요한 권리와 의무를 규정함을 목적으로 한다.",
    developmentScope,
    excludedScope,
    schedule,
    contractAmount,
    paymentTerms,
    deliverables,
    acceptanceCriteria,
    maintenance: "을은 배포일로부터 30일간 무상 하자보수를 제공한다. 이후 유지보수가 필요한 경우 별도 협의를 통해 유지보수 계약을 체결할 수 있다.",
    changeRequestPolicy: "본 계약의 개발 범위를 벗어나는 변경 요청은 별도 견적과 일정 협의를 거쳐 진행하며, 서면(이메일 포함) 합의 후 착수한다.",
    terminationClause: "일방이 본 계약상 의무를 중대하게 위반하고 상당한 기간 내 이를 시정하지 않는 경우, 상대방은 서면 통지로 계약을 해지할 수 있다. 해지 시 기성 부분에 대한 대가는 정산한다.",
    intellectualProperty: "최종 산출물에 대한 저작권은 잔금 지급이 완료된 시점에 갑에게 귀속된다. 단, 을이 개발 과정에서 사용한 프레임워크·라이브러리·자체 템플릿에 대한 권리는 을에게 유보된다.",
    confidentiality: "양 당사자는 본 계약의 이행 과정에서 알게 된 상대방의 영업비밀 및 미공개 정보를 상대방의 서면 동의 없이 제3자에게 누설하지 않는다.",
    specialTerms: [],
  };
}

export interface GenerateContractResult {
  result: ContractResult;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn` 기본값은 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다(lib/estimates/generator.ts의 generateEstimate()와 동일 패턴).
 */
export async function generateContract(
  input: ContractInput,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateContractResult> {
  const chatResult = await chatFn(buildContractPrompt(input), { system: SYSTEM_PROMPT });

  let judgment = chatResult.success && chatResult.content ? parseAiContract(chatResult.content) : null;
  const simulated = judgment === null;
  if (!judgment) judgment = buildDefaultContract(input);

  const result: ContractResult = judgment;

  return { result, simulated, provider: chatResult.provider, model: chatResult.model };
}
