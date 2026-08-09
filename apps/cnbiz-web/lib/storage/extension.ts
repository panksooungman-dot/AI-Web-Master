/** fsStore.ts와 supabaseStore.ts가 공유한다 — 파일명에서 스토리지 키/서빙 URL에 안전하게
 * 붙일 수 있는 확장자만 추출한다. 영숫자 1~8자로 이뤄진 확장자만 인정해 path traversal이나
 * 이상한 문자가 섞여 들어가는 것을 막는다. 소문자로 정규화해 lib/ai-analysis/analysis.ts·
 * lib/attachments/extractText.ts의 확장자 기반 분류(대소문자 무관하게 매칭)와 항상 일치시킨다. */
export function safeExtension(name: string): string {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return /^\.[a-zA-Z0-9]{1,8}$/.test(ext) ? ext.toLowerCase() : "";
}
