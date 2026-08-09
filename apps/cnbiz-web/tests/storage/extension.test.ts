import { describe, expect, it } from "vitest";
import { safeExtension, safeSlug } from "../../lib/storage/extension";

describe("safeExtension()", () => {
  it("extracts and lowercases a short alphanumeric extension", () => {
    expect(safeExtension("Logo.PNG")).toBe(".png");
    expect(safeExtension("report.PDF")).toBe(".pdf");
  });

  it("returns empty string for no extension, or an unsafe/too-long one", () => {
    expect(safeExtension("no-extension")).toBe("");
    expect(safeExtension("weird.tar.gz")).toBe(".gz");
    expect(safeExtension("bad.toolongextension")).toBe("");
    expect(safeExtension("bad.ha!ck")).toBe("");
  });
});

describe("safeSlug()", () => {
  it("lowercases and hyphenates a readable filename, dropping the extension", () => {
    expect(safeSlug("Company Logo Final.png")).toBe("company-logo-final");
    expect(safeSlug("service_photo-01.jpg")).toBe("service-photo-01");
  });

  it("preserves 'logo' as a substring so lib/ai-analysis/score.ts's LOGO_PATTERN can match it", () => {
    expect(safeSlug("우리회사-logo.png")).toContain("logo");
  });

  it("collapses non-ascii/symbol runs and trims leading/trailing hyphens", () => {
    expect(safeSlug("회사소개.pdf")).toBe(""); // 한글만 있으면 남는 게 없다 — LOGO_PATTERN처럼
    // 영문 부분 매칭에 의존하는 로직에는 애초에 해당되지 않는 케이스, 빈 문자열이 맞는 동작이다.
    expect(safeSlug("---weird...name---.txt")).toBe("weird-name");
  });

  it("truncates to 40 characters", () => {
    const long = `${"a".repeat(60)}.png`;
    expect(safeSlug(long).length).toBeLessThanOrEqual(40);
  });
});
