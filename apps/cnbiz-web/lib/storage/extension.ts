/** fsStore.ts와 supabaseStore.ts가 공유한다 — 파일명에서 스토리지 키/서빙 URL에 안전하게
 * 붙일 수 있는 확장자만 추출한다. 영숫자 1~8자로 이뤄진 확장자만 인정해 path traversal이나
 * 이상한 문자가 섞여 들어가는 것을 막는다. 소문자로 정규화해 lib/ai-analysis/analysis.ts·
 * lib/attachments/extractText.ts의 확장자 기반 분류(대소문자 무관하게 매칭)와 항상 일치시킨다. */
export function safeExtension(name: string): string {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return /^\.[a-zA-Z0-9]{1,8}$/.test(ext) ? ext.toLowerCase() : "";
}

/**
 * 두 스토리지 구현 모두 실제 저장 키/오브젝트 키는 원본 파일명과 무관한 무작위 id를 쓴다
 * (path traversal·URL 인코딩 문제 회피 목적, safeExtension()과 동일한 이유) — 그 결과
 * lib/ai-analysis/score.ts의 LOGO_PATTERN(`/logo/i`, "회사 로고" 완료 여부 판단)이 URL만
 * 보고는 원본 파일명에 "logo"가 포함되어 있는지 절대 알 수 없어 항상 매칭에 실패했다.
 * 저장 키 자체를 바꾸는 대신(스토리지 계층을 건드리지 않고), 사람이 읽을 수 있는 슬러그를
 * 반환 URL에 `?name=` 쿼리 파라미터로 실어 보낸다 — 확장자/문서 분류 로직(lib/ai-analysis/
 * analysis.ts, lib/attachments/extractText.ts)은 이미 쿼리 스트링을 떼어내고 판단하므로
 * 영향이 없고, 서빙 라우트(app/api/attachment-files/[id]/route.ts)도 쿼리 스트링은 아예
 * 보지 않으므로(경로 세그먼트만 params.id로 받음) 별도 처리가 필요 없다.
 */
export function safeSlug(name: string): string {
  const withoutExt = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
