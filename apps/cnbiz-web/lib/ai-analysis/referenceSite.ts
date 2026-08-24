import type { AIAnalysisInput } from "./types";

/**
 * 참고 사이트 URL을 실제로 fetch해서 title/description/본문 발췌를 뽑아낸다.
 *
 * 스크린샷 기반 시각 분석(레이아웃·색상 실측)은 하지 않는다 — Playwright 등 헤드리스
 * 브라우저를 Vercel 서버리스 함수 안에 넣는 건 번들 크기·콜드스타트 관점에서 이번 범위를
 * 벗어나는 별도 인프라 작업이다(CHANGELOG의 outputFileTracingIncludes 관련 기록 참고: 이
 * 저장소는 서버리스 함수 번들 크기에 이미 여러 번 발목 잡힌 이력이 있다). 대신 페이지의
 * 텍스트 콘텐츠(제목·설명·본문 발췌)를 뽑아 AI Analysis 프롬프트에 컨텍스트로 얹는다 —
 * "이 사이트가 어떤 톤·업종인지"는 텍스트만으로도 상당 부분 파악되고, 레이아웃 실측이
 * 필요해지면 그때 스크린샷 서비스(예: 외부 API)를 별도로 도입하면 된다.
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 300_000;
const EXCERPT_MAX_CHARS = 1500;

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/i;

/** 명시적 referenceUrls가 없을 때 survey(자유 설문)에서 URL을 추정한다 —
 *  lib/ai-analysis/score.ts의 surveyMatches()와 동일한 느슨한 매칭 원칙, 존재 여부가
 *  아니라 실제 URL 문자열을 뽑아내야 하므로 별도로 둔다. 챗봇 설문 답변에 URL이 있다면
 *  거의 항상 참고 사이트 언급이라고 보고, 키/값 문구 패턴은 따로 요구하지 않는다. */
function extractReferenceUrlFromSurvey(survey?: Record<string, unknown>): string | null {
  if (!survey) return null;
  for (const value of Object.values(survey)) {
    if (typeof value !== "string") continue;
    const urlMatch = value.match(URL_PATTERN);
    if (urlMatch) return urlMatch[0];
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  return match?.[1]?.trim() ?? "";
}

async function fetchSiteText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CNBIZ-AI-Analysis/1.0)" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const buffer = await res.arrayBuffer();
    const html = Buffer.from(buffer.slice(0, MAX_HTML_BYTES)).toString("utf-8");

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const excerpt = stripHtml(html).slice(0, EXCERPT_MAX_CHARS);

    const parts = [
      title && `제목: ${title}`,
      description && `설명: ${description}`,
      excerpt && `본문 발췌: ${excerpt}`,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join("\n") : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchReferenceSiteContext(input: AIAnalysisInput): Promise<string | null> {
  const url = input.referenceUrls?.[0] ?? extractReferenceUrlFromSurvey(input.survey);
  if (!url) return null;
  return fetchSiteText(url);
}
