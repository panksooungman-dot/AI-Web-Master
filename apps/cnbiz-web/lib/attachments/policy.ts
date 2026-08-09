/** app/developer/inquiries/new/page.tsx(클라이언트 미리 검증)와 app/api/attachments/upload/route.ts
 * (서버 최종 검증)가 공유한다 — 검증 로직 자체를 복제하지 않고 기준값만 공유한다. */
export const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".webp"];

// 저장소 전체에 첨부파일 최대 크기 정책이 아직 없다(검색 결과 없음, 2026-07-21 확인) — Supabase
// Storage 업로드가 실제로 구현되면 그때 정해지는 정책 값으로 교체한다. 그 전까지의 임시 기본값.
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function isAcceptedFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
