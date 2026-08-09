/**
 * lib/ai-analysis/analysis.ts(vision에 넘길 이미지 판별)·lib/attachments/extractText.ts(텍스트
 * 추출 대상 문서 판별)·lib/ai-analysis/score.ts(로고/서비스 사진 완료도 판별) 세 곳이 모두 같은
 * 방식(URL 확장자)으로 첨부파일 종류를 판단해야 해서 공유한다(CNBIZ_RULES.md의 "중복 코드가
 * 3회 이상 반복되면 추출한다" 기준). lib/storage의 두 스토리지 구현이 항상 URL에 원본 확장자를
 * 보존하므로(lib/storage/extension.ts의 safeExtension) 이 판단만으로 충분하다.
 */
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];

/** `?name=...` 같은 쿼리 스트링(lib/storage/extension.ts의 safeSlug)을 먼저 떼어낸 뒤 판단한다. */
export function extensionOf(url: string): string {
  const withoutQuery = url.toLowerCase().split("?")[0];
  const match = withoutQuery.match(/\.[a-z0-9]{1,8}$/);
  return match ? match[0] : "";
}

export function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.includes(extensionOf(url));
}

export function isDocumentUrl(url: string): boolean {
  return DOCUMENT_EXTENSIONS.includes(extensionOf(url));
}
