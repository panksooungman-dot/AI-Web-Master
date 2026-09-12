/**
 * app/api/inquiries/[id]/route.ts(PATCH)가 쓰는 순수 병합 로직. 2026-09-12 —
 * Missing Items(lib/ai-analysis/score.ts) 중 초기 접수 이후에는 /developer/inquiries/[id]에서
 * 채울 방법이 아예 없던 4개 항목(회사 로고·참고 사이트·브랜드 컬러·도메인)을 위해 추가했다.
 * companyName 등과 달리 이 넷은 InquiryInput의 배열/객체 필드(referenceUrls/survey/
 * uploadedFiles)에 걸쳐 있어 "문자열 필드 그대로 대입"하는 기존 패턴을 쓸 수 없다 — 참고
 * 사이트는 목록 전체를 대체하고, 브랜드 컬러·도메인은 survey에 병합하며, 로고는 uploadedFiles에
 * 추가만 하고 기존 첨부는 보존한다. cookies()를 쓰는 route.ts와 분리해 둬야 이 순수 로직만
 * vitest로 직접 테스트할 수 있다(route.ts는 getCurrentActorEmail()이 next/headers를 쓰므로
 * 이 저장소 관례상 직접 임포트해 테스트하지 않는다).
 */

export const BRAND_COLOR_SURVEY_KEY = "브랜드컬러";
export const DOMAIN_SURVEY_KEY = "도메인";

export function pickReferenceUrls(body: Record<string, unknown>): string[] | undefined {
  if (!Array.isArray(body.referenceUrls)) return undefined;
  return body.referenceUrls
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

export function mergeSurveyPatch(
  current: Record<string, unknown> | undefined,
  body: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (typeof body.brandColor !== "string" && typeof body.domain !== "string") return undefined;

  const next = { ...(current ?? {}) };
  if (typeof body.brandColor === "string") {
    const value = body.brandColor.trim();
    if (value) next[BRAND_COLOR_SURVEY_KEY] = value;
    else delete next[BRAND_COLOR_SURVEY_KEY];
  }
  if (typeof body.domain === "string") {
    const value = body.domain.trim();
    if (value) next[DOMAIN_SURVEY_KEY] = value;
    else delete next[DOMAIN_SURVEY_KEY];
  }
  return next;
}

export function mergeUploadedFiles(current: string[] | undefined, body: Record<string, unknown>): string[] | undefined {
  if (!Array.isArray(body.addUploadedFiles)) return undefined;
  const additions = body.addUploadedFiles.filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  if (additions.length === 0) return undefined;

  const merged = [...(current ?? [])];
  for (const url of additions) {
    if (!merged.includes(url)) merged.push(url);
  }
  return merged;
}
