import { describe, expect, it } from "vitest";
import { safeFileName } from "../../lib/uploads/storage";

/**
 * 2026-09-12 실사용 버그 — 한글 파일명("사색찬미한정식_...v2.docx")을 첨부하면 Supabase Storage가
 * "Invalid key"로 업로드를 거부함을 프로덕션 Error Report에서 확인했다. 원인은 safeFileName()이
 * 한글(가-힣)을 저장 키 허용 문자에 넣어 그대로 통과시키던 것 — Supabase Storage의 오브젝트 키는
 * ASCII만 허용한다. 이 테스트는 그 회귀를 다시 만들지 않기 위한 것이다.
 */
describe("safeFileName() — lib/uploads/storage.ts", () => {
  it("한글이 포함된 파일명에서 한글을 전부 제거해 ASCII 전용 키를 만든다", () => {
    const result = safeFileName("사색찬미한정식_Claude_Code_홈페이지_개발기획서_스토리보드_v2.docx");
    expect(result).toMatch(/^[a-zA-Z0-9_-]+\.docx$/);
  });

  it("영문/숫자로만 된 basename은 그대로 보존한다", () => {
    const result = safeFileName("proposal-v2.docx");
    expect(result).toContain("proposal-v2.docx");
  });

  it("basename이 한글뿐이라 전부 치환되어도 유효한 키를 만든다(빈 파일명으로 무너지지 않음)", () => {
    const result = safeFileName("사색찬미한정식.docx");
    expect(result).toMatch(/^[a-zA-Z0-9_-]+\.docx$/);
    expect(result.length).toBeGreaterThan(".docx".length);
  });

  it("호출마다 다른 UUID 접두사를 붙여 같은 이름이 충돌하지 않는다", () => {
    const a = safeFileName("proposal.docx");
    const b = safeFileName("proposal.docx");
    expect(a).not.toBe(b);
  });

  it("확장자를 유지한다", () => {
    expect(safeFileName("사진.png")).toMatch(/\.png$/);
    expect(safeFileName("문서.pdf")).toMatch(/\.pdf$/);
  });
});
