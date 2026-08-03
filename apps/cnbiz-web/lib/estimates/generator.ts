import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { EstimateInput, EstimateJudgment, EstimateLineItem, EstimateResult } from "./types";

const SYSTEM_PROMPT =
  "You are a senior technical estimator for AI Business OS. Given a project's detected business " +
  "type, recommended pages, recommended functions, and customer requirements, produce a single " +
  "JSON object (no prose, no markdown fences) with exactly these keys: lineItems, priceRangeMin, " +
  "priceRangeMax, timelineWeeks, assumptions, summary. Prices are in Korean Won(KRW). Do not invent " +
  "requirements the input does not support.";

function buildEstimatePrompt(input: EstimateInput): string {
  return `회사명: ${input.companyName}
업종: ${input.detectedBusinessType}
추천 페이지: ${input.recommendedPages.join(", ") || "(없음)"}
추천 기능: ${input.recommendedFunctions.join(", ") || "(없음)"}
요구사항:
${input.requirements || "(내용 없음)"}
고객 제시 예산: ${input.budget || "(미기재)"}

Return ONLY a JSON object shaped like:
{
  "lineItems": [{ "name": string, "description": string, "estimatedHours": number }],
  "priceRangeMin": number (KRW),
  "priceRangeMax": number (KRW),
  "timelineWeeks": number,
  "assumptions": string[],
  "summary": string (한국어 2~4문장 요약)
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isLineItemArray(value: unknown): value is EstimateLineItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isNonEmptyString((item as Record<string, unknown>).name) &&
        isNonEmptyString((item as Record<string, unknown>).description) &&
        typeof (item as Record<string, unknown>).estimatedHours === "number"
    )
  );
}

/**
 * AI 응답을 EstimateJudgment로 파싱한다. 형태가 조금이라도 어긋나면 null을 반환해 호출자가
 * 결정론적 기본값으로 폴백하도록 한다(lib/ai-analysis/analysis.ts의 parseAiJudgment()와 동일한
 * all-or-nothing 검증 원칙).
 */
function parseAiEstimate(raw: string): EstimateJudgment | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (
    !isLineItemArray(obj.lineItems) ||
    obj.lineItems.length === 0 ||
    typeof obj.priceRangeMin !== "number" ||
    typeof obj.priceRangeMax !== "number" ||
    typeof obj.timelineWeeks !== "number" ||
    !isStringArray(obj.assumptions) ||
    !isNonEmptyString(obj.summary)
  ) {
    return null;
  }

  return {
    lineItems: obj.lineItems,
    priceRangeMin: Math.max(0, obj.priceRangeMin),
    priceRangeMax: Math.max(obj.priceRangeMin, obj.priceRangeMax),
    timelineWeeks: Math.max(1, Math.round(obj.timelineWeeks)),
    assumptions: obj.assumptions,
    summary: obj.summary,
  };
}

const HOURLY_RATE_KRW = 50_000;
const HOURS_PER_PAGE = 8;
const HOURS_PER_FUNCTION = 12;
const OVERHEAD_HOURS = 16;
const WEEKLY_CAPACITY_HOURS = 20;
const PRICE_ROUNDING_KRW = 10_000;

/**
 * Provider 미설정이거나 응답 파싱에 실패해도 항상 유효한 견적을 내는 결정론적 폴백
 * (lib/ai-analysis/analysis.ts의 buildDefaultJudgment()와 동일한 역할). AI Analysis Engine이
 * 이미 산출한 recommendedPages/recommendedFunctions 개수를 그대로 견적 항목 수로 사용한다.
 */
function buildDefaultEstimate(input: EstimateInput): EstimateJudgment {
  const pageItems: EstimateLineItem[] = input.recommendedPages.map((page) => ({
    name: `${page} 페이지`,
    description: `${page} 페이지 디자인·퍼블리싱·콘텐츠 반영`,
    estimatedHours: HOURS_PER_PAGE,
  }));
  const functionItems: EstimateLineItem[] = input.recommendedFunctions.map((fn) => ({
    name: `${fn} 기능`,
    description: `${fn} 기능 설계·구현·테스트`,
    estimatedHours: HOURS_PER_FUNCTION,
  }));
  const overheadItem: EstimateLineItem = {
    name: "기획/QA/배포",
    description: "요구사항 정리, 품질 검수, 배포 및 초기 대응",
    estimatedHours: OVERHEAD_HOURS,
  };

  const lineItems = [...pageItems, ...functionItems, overheadItem];
  const totalHours = lineItems.reduce((sum, item) => sum + item.estimatedHours, 0);
  const priceCenter = totalHours * HOURLY_RATE_KRW;

  return {
    lineItems,
    priceRangeMin: Math.round((priceCenter * 0.85) / PRICE_ROUNDING_KRW) * PRICE_ROUNDING_KRW,
    priceRangeMax: Math.round((priceCenter * 1.15) / PRICE_ROUNDING_KRW) * PRICE_ROUNDING_KRW,
    timelineWeeks: Math.max(1, Math.ceil(totalHours / WEEKLY_CAPACITY_HOURS)),
    assumptions: [
      "제공된 AI 분석 결과(추천 페이지·기능)를 기준으로 산정된 개략 견적입니다.",
      "실제 견적은 상세 요구사항 확인 후 조정될 수 있습니다.",
      input.budget ? `고객 제시 예산: ${input.budget}` : "고객이 제시한 예산 정보가 없습니다.",
    ],
    summary:
      `${input.companyName}의 ${input.detectedBusinessType} 홈페이지 제작 견적입니다. ` +
      `추천 페이지 ${input.recommendedPages.length}종, 추천 기능 ${input.recommendedFunctions.length}종을 기준으로 산정했습니다. ` +
      "AI 분석 엔진이 상세 판단을 내리지 못해 기본값으로 대체된 견적입니다.",
  };
}

export interface GenerateEstimateResult {
  result: EstimateResult;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn` 기본값은 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다(lib/ai-analysis/analysis.ts의 generateAnalysis()와 동일 패턴).
 */
export async function generateEstimate(
  input: EstimateInput,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateEstimateResult> {
  const chatResult = await chatFn(buildEstimatePrompt(input), { system: SYSTEM_PROMPT });

  let judgment = chatResult.success && chatResult.content ? parseAiEstimate(chatResult.content) : null;
  const simulated = judgment === null;
  if (!judgment) judgment = buildDefaultEstimate(input);

  const result: EstimateResult = { currency: "KRW", ...judgment };

  return { result, simulated, provider: chatResult.provider, model: chatResult.model };
}
