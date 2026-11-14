import { describe, expect, it } from "vitest";
import { isPlainPath } from "@/components/layout/SiteChrome";

describe("isPlainPath — 계약 관련 화면에서 사이트 틀·방문 통계를 끈다", () => {
  it("관리자·근로자 계약 경로는 true", () => {
    for (const p of ["/admin", "/admin/login", "/admin/contracts/new", "/contract/abc123", "/contract"]) expect(isPlainPath(p)).toBe(true);
  });
  it("일반 사이트 경로는 false (이름이 비슷해도 구분)", () => {
    for (const p of ["/", "/menu", "/reservation", "/administrator", "/contracts", "/about"]) expect(isPlainPath(p)).toBe(false);
  });
  it("경로를 알 수 없으면 false", () => {
    expect(isPlainPath(null)).toBe(false);
  });
});
