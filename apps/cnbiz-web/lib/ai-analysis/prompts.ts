import type { AIAnalysisInput } from "./types";

export const AI_ANALYSIS_SYSTEM_PROMPT =
  "You are a senior AI business analyst for AI Business OS. Given a customer inquiry's consultation " +
  "content, survey answers, uploaded file list, and (when available) a vision description of " +
  "uploaded images, an excerpt from a reference site, and attached code file contents, produce a " +
  "single JSON object with exactly these keys: detectedBusinessType, recommendedPages, " +
  "recommendedFunctions, confidence, summary. " +
  "Respond with ONLY that JSON object — no prose before or after it, no markdown code fences, no " +
  "explanations. Your entire response must be valid JSON parseable by JSON.parse(), with no trailing " +
  "commas and no comments. Do not invent facts the input does not support. This analysis feeds a " +
  "later Phase's document generators — it must never itself contain a quote, feature spec, or timeline.";

/** generateAnalysis()가 vision.ts/referenceSite.ts로 미리 만들어 전달하는 추가 컨텍스트.
 *  전부 선택값 — 하나도 없어도(폴백/미설정) 기존과 동일한 프롬프트가 만들어진다. */
export interface AnalysisPromptContext {
  visionDescription?: string | null;
  referenceSiteContext?: string | null;
}

export function buildAnalysisPrompt(input: AIAnalysisInput, context: AnalysisPromptContext = {}): string {
  const codeSnippetsSection =
    input.codeSnippets && input.codeSnippets.length > 0
      ? input.codeSnippets
          .map((snippet) => `--- ${snippet.filename} ---\n${snippet.content.slice(0, 3000)}`)
          .join("\n\n")
      : "(없음)";

  return `회사명: ${input.companyName || "(미상)"}
업종: ${input.industry || "(미상)"}
사이트 유형(챗봇 분류): ${input.siteType || "(미상)"}
상담 내용:
${input.requirements || "(내용 없음)"}

설문 응답:
${input.survey && Object.keys(input.survey).length > 0 ? JSON.stringify(input.survey, null, 2) : "(없음)"}

업로드된 파일 수: ${(input.uploadedFiles ?? []).length}건
업로드된 이미지 실제 분석(비전 AI): ${context.visionDescription || "(비전 분석 없음 — 미설정 또는 실패)"}

참고 사이트 실제 조회 결과: ${context.referenceSiteContext || "(조회된 참고 사이트 없음)"}

첨부된 코드 파일:
${codeSnippetsSection}

Return ONLY a JSON object shaped like:
{
  "detectedBusinessType": string (예: "Restaurant","Hospital","Law Firm","Academy","Manufacturing","Construction","쇼핑몰","기업홈페이지","랜딩페이지" 중 가장 적합한 값, 해당 사항이 없으면 그에 준하는 자유 문자열),
  "recommendedPages": string[] (예: "Home","About","Service","Portfolio","FAQ","Contact","Blog" 중 이 사업에 실제로 필요한 것들만),
  "recommendedFunctions": string[] (예: "Reservation","Estimate","Inquiry","Chat","Map","Review","Payment","Login","Admin" 중 이 사업에 실제로 필요한 것들만),
  "confidence": number (0~1, 이 분석 결과에 대한 확신도),
  "summary": string (프로젝트를 3~5문장의 한국어로 요약)
}`;
}
