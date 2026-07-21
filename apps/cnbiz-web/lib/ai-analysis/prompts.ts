import type { AIAnalysisInput } from "./types";

export const AI_ANALYSIS_SYSTEM_PROMPT =
  "You are a senior AI business analyst for AI Business OS. Given a customer inquiry's consultation " +
  "content, survey answers, and uploaded file list, produce a single JSON object (no prose, no markdown " +
  "fences) with exactly these keys: detectedBusinessType, recommendedPages, recommendedFunctions, " +
  "confidence, summary. Do not invent facts the input does not support. This analysis feeds a later " +
  "Phase's document generators — it must never itself contain a quote, feature spec, or timeline.";

export function buildAnalysisPrompt(input: AIAnalysisInput): string {
  return `회사명: ${input.companyName || "(미상)"}
업종: ${input.industry || "(미상)"}
사이트 유형(챗봇 분류): ${input.siteType || "(미상)"}
상담 내용:
${input.requirements || "(내용 없음)"}

설문 응답:
${input.survey && Object.keys(input.survey).length > 0 ? JSON.stringify(input.survey, null, 2) : "(없음)"}

업로드된 파일 수: ${(input.uploadedFiles ?? []).length}건

Return ONLY a JSON object shaped like:
{
  "detectedBusinessType": string (예: "Restaurant","Hospital","Law Firm","Academy","Manufacturing","Construction","쇼핑몰","기업홈페이지","랜딩페이지" 중 가장 적합한 값, 해당 사항이 없으면 그에 준하는 자유 문자열),
  "recommendedPages": string[] (예: "Home","About","Service","Portfolio","FAQ","Contact","Blog" 중 이 사업에 실제로 필요한 것들만),
  "recommendedFunctions": string[] (예: "Reservation","Estimate","Inquiry","Chat","Map","Review","Payment","Login","Admin" 중 이 사업에 실제로 필요한 것들만),
  "confidence": number (0~1, 이 분석 결과에 대한 확신도),
  "summary": string (프로젝트를 3~5문장의 한국어로 요약)
}`;
}
