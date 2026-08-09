import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import { extractJsonPayload } from "@/lib/ai/json";
import { extractDocumentTexts } from "@/lib/attachments/extractText";
import { WEBSITE_TYPES } from "@/lib/websites/types";
import { computeCompleteness } from "./score";
import { AI_ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "./prompts";
import type { AIAnalysisInput, AIAnalysisResult } from "./types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** AI가 판단하는 부분만 — completeness/missingItems는 score.ts가 결정론적으로 계산하므로 여기 없음. */
interface AiJudgment {
  detectedBusinessType: string;
  recommendedPages: string[];
  recommendedFunctions: string[];
  confidence: number;
  summary: string;
}

/**
 * AI 응답을 AiJudgment로 파싱한다. 형태가 조금이라도 어긋나면 null을 반환해 호출자가 결정론적
 * 기본값으로 폴백하도록 한다(lib/design/generator.ts의 parseDesignPlanContent()와 동일한
 * all-or-nothing 검증 원칙 — 절반만 유효한 데이터를 그대로 쓰지 않는다).
 */
function parseAiJudgment(raw: string): AiJudgment | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonPayload(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (
    !isNonEmptyString(obj.detectedBusinessType) ||
    !isStringArray(obj.recommendedPages) ||
    !isStringArray(obj.recommendedFunctions) ||
    typeof obj.confidence !== "number" ||
    !isNonEmptyString(obj.summary)
  ) {
    return null;
  }

  return {
    detectedBusinessType: obj.detectedBusinessType,
    recommendedPages: obj.recommendedPages,
    recommendedFunctions: obj.recommendedFunctions,
    confidence: Math.min(1, Math.max(0, obj.confidence)),
    summary: obj.summary,
  };
}

const BUSINESS_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  WEBSITE_TYPES.map((type) => [type.id, type.label])
);

const DEFAULT_PAGES = ["Home", "About", "Service", "Contact"];
const DEFAULT_FUNCTIONS = ["Inquiry"];

/**
 * Provider 미설정이거나 응답 파싱에 실패해도 항상 유효한 판단을 내는 결정론적 폴백
 * (lib/design/generator.ts의 buildDefaultDesignPlan()과 동일한 역할). 챗봇이 이미 분류해 보낸
 * siteType(packages/cli의 WEBSITE_TYPES와 동일 id 체계, lib/websites/types.ts로 이미 대시보드에
 * 노출 중)을 재사용해 최소한의 의미 있는 값을 만든다.
 */
function buildDefaultJudgment(input: AIAnalysisInput): AiJudgment {
  const businessType = BUSINESS_TYPE_LABELS[input.siteType] || input.industry?.trim() || "기업홈페이지";
  const company = input.companyName?.trim() || "고객사";

  return {
    detectedBusinessType: businessType,
    recommendedPages: DEFAULT_PAGES,
    recommendedFunctions: DEFAULT_FUNCTIONS,
    confidence: 0.3,
    summary:
      `${company}의 ${businessType} 관련 홈페이지 제작 요청입니다. ` +
      `${input.requirements?.trim() || "상세 요구사항은 아직 파악되지 않았습니다."} ` +
      "AI 분석 엔진이 상세 판단을 내리지 못해 기본값으로 대체된 요약입니다.",
  };
}

export interface GenerateAnalysisResult {
  result: AIAnalysisResult;
  simulated: boolean;
  provider?: string;
  model?: string;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/** uploadedFiles 중 실제로 vision에 넘길 수 있는 것만 고른다 — PDF/DOC/TXT는 이미지 콘텐츠
 * 블록으로 보낼 수 없으므로 별도로 extractDocumentTexts()가 텍스트로 추출해 프롬프트 본문에
 * 직접 삽입한다(아래 buildPromptWithAttachments 참고). */
function extractImageUrls(uploadedFiles: string[] | undefined): string[] {
  if (!uploadedFiles) return [];
  return uploadedFiles.filter((url) => IMAGE_EXTENSIONS.some((ext) => url.toLowerCase().split("?")[0].endsWith(ext)));
}

/**
 * 기본 프롬프트에 첨부 문서(PDF/DOC/DOCX/TXT)에서 추출한 원문을 덧붙인다. 추출에 실패한
 * 문서(스캔 이미지형 PDF, 손상된 파일 등)는 조용히 건너뛰고 콘솔에만 경고를 남긴다 —
 * packages/cli/src/commands/chat.ts의 resolveImages()와 동일하게, 첨부파일 하나의 실패가
 * 전체 분석을 시뮬레이션 폴백으로 떨어뜨리는 과한 실패 모드를 피한다.
 */
async function buildPromptWithAttachments(input: AIAnalysisInput): Promise<string> {
  const basePrompt = buildAnalysisPrompt(input);
  const documents = await extractDocumentTexts(input.uploadedFiles);

  const succeeded = documents.filter((doc): doc is { url: string; text: string } => typeof doc.text === "string");
  for (const failed of documents) {
    if (failed.error) console.warn(`[ai-analysis] 문서 텍스트 추출 실패 (${failed.url}): ${failed.error}`);
  }
  if (succeeded.length === 0) return basePrompt;

  const section = succeeded
    .map((doc, index) => `[첨부 문서 ${index + 1}]\n${doc.text}`)
    .join("\n\n---\n\n");

  return `${basePrompt}\n\n=== 첨부 문서 원문 ===\n\n${section}`;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn` 기본값은 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다(packages/cli를 Next.js 앱에서 직접 import하지 않는 기존 원칙 유지,
 * lib/design/generator.ts의 generateDesignPlan()과 동일 패턴).
 *
 * completeness/missingItems는 AI 호출 성공 여부와 무관하게 항상 score.ts의 결정론적 계산 결과다
 * — "얼마나 채워졌는지"는 규칙 기반으로 100% 신뢰 가능해야 하고, "무엇을 추천하는지"만 AI 판단
 * 영역으로 분리한다.
 */
export async function generateAnalysis(
  input: AIAnalysisInput,
  chatFn: (
    message: string,
    options?: { system?: string; provider?: string; images?: string[] }
  ) => Promise<ChatResult> = chatViaCli
): Promise<GenerateAnalysisResult> {
  const { completeness, missingItems } = computeCompleteness(input);

  const chatResult = await chatFn(await buildPromptWithAttachments(input), {
    system: AI_ANALYSIS_SYSTEM_PROMPT,
    images: extractImageUrls(input.uploadedFiles),
  });

  let judgment = chatResult.success && chatResult.content ? parseAiJudgment(chatResult.content) : null;
  const simulated = judgment === null;
  if (!judgment) judgment = buildDefaultJudgment(input);

  const result: AIAnalysisResult = {
    completeness,
    missingItems,
    detectedBusinessType: judgment.detectedBusinessType,
    recommendedPages: judgment.recommendedPages,
    recommendedFunctions: judgment.recommendedFunctions,
    confidence: judgment.confidence,
    summary: judgment.summary,
  };

  return { result, simulated, provider: chatResult.provider, model: chatResult.model };
}
