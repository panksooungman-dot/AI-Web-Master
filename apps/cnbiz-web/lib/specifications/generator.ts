import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import { extractJsonPayload } from "@/lib/ai/json";
import type {
  SpecApiEndpoint,
  SpecFeature,
  SpecFeaturePriority,
  SpecPage,
  SpecificationInput,
  SpecificationJudgment,
  SpecificationResult,
} from "./types";

const SYSTEM_PROMPT =
  "You are a senior functional spec writer for AI Business OS. Given a project's detected business " +
  "type, recommended pages, recommended functions, and customer requirements, produce a single " +
  "JSON object with exactly these keys: overview, pages, features, adminFeatures, apis, dbOverview, " +
  "scopeIncluded, scopeExcluded, techStack, deliverables. Respond with ONLY that JSON object — no " +
  "prose before or after it, no markdown code fences, no explanations. Your entire response must be " +
  "valid JSON parseable by JSON.parse(), with no trailing commas and no comments. Do not invent " +
  "requirements the input does not support.";

function buildSpecificationPrompt(input: SpecificationInput): string {
  return `회사명: ${input.companyName}
업종: ${input.detectedBusinessType}
추천 페이지: ${input.recommendedPages.join(", ") || "(없음)"}
추천 기능: ${input.recommendedFunctions.join(", ") || "(없음)"}
요구사항:
${input.requirements || "(내용 없음)"}

Return ONLY a JSON object shaped like:
{
  "overview": string (한국어 2~3문장 프로젝트 개요),
  "pages": [{ "name": string, "description": string }] (input의 recommendedPages 기반),
  "features": [{ "name": string, "description": string, "priority": "High"|"Medium"|"Low" }] (input의 recommendedFunctions 기반),
  "adminFeatures": string[] (관리자 화면에서 필요한 기능),
  "apis": [{ "method": string, "path": string, "description": string }],
  "dbOverview": string (한국어 1~2문장 DB 구조 개요),
  "scopeIncluded": string[] (개발 범위),
  "scopeExcluded": string[] (제외 범위),
  "techStack": string[],
  "deliverables": string[] (산출물)
}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSpecFeaturePriority(value: unknown): value is SpecFeaturePriority {
  return value === "High" || value === "Medium" || value === "Low";
}

function isSpecPageArray(value: unknown): value is SpecPage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isNonEmptyString((item as Record<string, unknown>).name) &&
        typeof (item as Record<string, unknown>).description === "string"
    )
  );
}

function isSpecFeatureArray(value: unknown): value is SpecFeature[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isNonEmptyString((item as Record<string, unknown>).name) &&
        typeof (item as Record<string, unknown>).description === "string" &&
        isSpecFeaturePriority((item as Record<string, unknown>).priority)
    )
  );
}

function isSpecApiEndpointArray(value: unknown): value is SpecApiEndpoint[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isNonEmptyString((item as Record<string, unknown>).method) &&
        isNonEmptyString((item as Record<string, unknown>).path) &&
        typeof (item as Record<string, unknown>).description === "string"
    )
  );
}

/**
 * AI 응답을 SpecificationJudgment로 파싱한다. 형태가 조금이라도 어긋나면 null을 반환해 호출자가
 * 결정론적 기본값으로 폴백하도록 한다(lib/estimates/generator.ts의 parseAiEstimate()와 동일한
 * all-or-nothing 검증 원칙).
 */
function parseAiSpecification(raw: string): SpecificationJudgment | null {
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
    !isSpecPageArray(obj.pages) ||
    obj.pages.length === 0 ||
    !isSpecFeatureArray(obj.features) ||
    !isStringArray(obj.adminFeatures) ||
    !isSpecApiEndpointArray(obj.apis) ||
    !isNonEmptyString(obj.dbOverview) ||
    !isStringArray(obj.scopeIncluded) ||
    !isStringArray(obj.scopeExcluded) ||
    !isStringArray(obj.techStack) ||
    !isStringArray(obj.deliverables)
  ) {
    return null;
  }

  return {
    overview: obj.overview,
    pages: obj.pages,
    features: obj.features,
    adminFeatures: obj.adminFeatures,
    apis: obj.apis,
    dbOverview: obj.dbOverview,
    scopeIncluded: obj.scopeIncluded,
    scopeExcluded: obj.scopeExcluded,
    techStack: obj.techStack,
    deliverables: obj.deliverables,
  };
}

const DEFAULT_PAGE_NAME = "Home";
const DEFAULT_FEATURE_NAME = "문의하기";
/** TECH_STACK.md(docs/02_DEVELOPMENT)가 정의하는 AI Business OS 표준 스택 — 임의로 지어낸 값이 아니다. */
const DEFAULT_TECH_STACK = ["Next.js (App Router)", "TypeScript", "React", "Tailwind CSS", "Supabase"];

/** API 경로에 쓸 수 있도록 한글/공백을 제거한 소문자 슬러그로 변환한다. */
function toApiSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "resource";
}

/**
 * Provider 미설정이거나 응답 파싱에 실패해도 항상 유효한 명세서를 내는 결정론적 폴백
 * (lib/estimates/generator.ts의 buildDefaultEstimate()와 동일한 역할). AI Analysis Engine이
 * 이미 산출한 recommendedPages/recommendedFunctions를 그대로 명세서 항목으로 사용한다.
 */
function buildDefaultSpecification(input: SpecificationInput): SpecificationJudgment {
  const pageNames = input.recommendedPages.length > 0 ? input.recommendedPages : [DEFAULT_PAGE_NAME];
  const functionNames = input.recommendedFunctions.length > 0 ? input.recommendedFunctions : [DEFAULT_FEATURE_NAME];

  const pages: SpecPage[] = pageNames.map((name) => ({
    name,
    description: `${name} 페이지 구성 및 콘텐츠 배치`,
  }));

  const features: SpecFeature[] = functionNames.map((name) => ({
    name,
    description: `${name} 기능 설계 및 구현`,
    priority: "Medium",
  }));

  const adminFeatures: string[] = [
    "문의 내역 조회 및 상태 관리",
    "페이지 콘텐츠 수정",
    ...functionNames.map((name) => `${name} 데이터 관리`),
  ];

  const apis: SpecApiEndpoint[] = [
    { method: "POST", path: "/api/inquiries", description: "문의 접수" },
    ...functionNames.map((name) => ({
      method: "GET",
      path: `/api/${toApiSlug(name)}`,
      description: `${name} 데이터 조회`,
    })),
  ];

  const dbOverview =
    `${input.detectedBusinessType} 업종 특성에 맞춰 페이지 콘텐츠와 문의 데이터를 저장하는 구조입니다. ` +
    `주요 엔터티: Inquiry(문의), Page Content(페이지 콘텐츠)${functionNames.length > 0 ? `, ${functionNames.join("/")}` : ""}.`;

  const scopeIncluded = [
    `추천 페이지 ${pages.length}종 디자인 및 퍼블리싱`,
    `추천 기능 ${features.length}종 구현`,
    "반응형 웹(모바일/태블릿/데스크탑) 대응",
  ];

  const scopeExcluded = [
    "제3자 유료 API·라이선스 비용",
    "콘텐츠(텍스트·이미지) 촬영 및 제작",
    "출시 이후 별도 협의 없는 무제한 유지보수",
  ];

  const deliverables = ["배포된 웹사이트(프로덕션 URL)", "소스코드 저장소(GitHub)", "관리자 화면 사용 가이드"];

  const overview =
    `${input.companyName}의 ${input.detectedBusinessType} 홈페이지 기능 명세서입니다. ` +
    `추천 페이지 ${pages.length}종, 추천 기능 ${features.length}종을 기준으로 작성했습니다. ` +
    "AI 분석 엔진이 상세 판단을 내리지 못해 기본값으로 대체된 명세서입니다.";

  return {
    overview,
    pages,
    features,
    adminFeatures,
    apis,
    dbOverview,
    scopeIncluded,
    scopeExcluded,
    techStack: DEFAULT_TECH_STACK,
    deliverables,
  };
}

export interface GenerateSpecificationResult {
  result: SpecificationResult;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn` 기본값은 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다(lib/estimates/generator.ts의 generateEstimate()와 동일 패턴).
 */
export async function generateSpecification(
  input: SpecificationInput,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateSpecificationResult> {
  const chatResult = await chatFn(buildSpecificationPrompt(input), { system: SYSTEM_PROMPT });

  let judgment = chatResult.success && chatResult.content ? parseAiSpecification(chatResult.content) : null;
  const simulated = judgment === null;
  if (!judgment) judgment = buildDefaultSpecification(input);

  const result: SpecificationResult = judgment;

  return { result, simulated, provider: chatResult.provider, model: chatResult.model };
}
