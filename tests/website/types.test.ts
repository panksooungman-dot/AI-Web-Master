import { describe, expect, it } from "vitest";
import {
  WEBSITE_TYPES,
  PALETTES,
  SITE_TYPE_COPY,
  isWebsiteType,
  siteTypeLabel,
  resolvePalette,
  type WebsiteType
} from "../../packages/cli/src/website/types.js";

const REQUIRED_PALETTE_KEYS = [
  "primary",
  "primaryDark",
  "secondary",
  "accent",
  "background",
  "foreground",
  "muted",
  "border",
  "success",
  "warning",
  "danger"
] as const;

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;

describe("Website Builder v2 — site type registry (packages/cli/src/website/types.ts)", () => {
  it("exposes exactly the 11 documented site types", () => {
    expect(WEBSITE_TYPES).toHaveLength(11);
    expect([...WEBSITE_TYPES].sort()).toEqual(
      [
        "agency",
        "blog",
        "corporate",
        "dental",
        "education",
        "hospital",
        "landing",
        "portfolio",
        "restaurant",
        "shopping",
        "website"
      ].sort()
    );
  });

  it("isWebsiteType() accepts every registered type and rejects unknown values", () => {
    for (const type of WEBSITE_TYPES) {
      expect(isWebsiteType(type)).toBe(true);
    }
    expect(isWebsiteType("not-a-real-type")).toBe(false);
    expect(isWebsiteType("")).toBe(false);
  });

  it("PALETTES has one complete, valid hex-color token set per site type", () => {
    for (const type of WEBSITE_TYPES) {
      const palette = PALETTES[type];
      expect(palette).toBeDefined();

      for (const key of REQUIRED_PALETTE_KEYS) {
        expect(palette[key], `${type}.${key}`).toMatch(HEX_COLOR);
      }
    }
  });

  it("each site type has a visually distinct primary color (palettes are not all fallback copies)", () => {
    const primaries = WEBSITE_TYPES.map((type) => PALETTES[type].primary);
    const uniquePrimaries = new Set(primaries);

    expect(uniquePrimaries.size).toBe(WEBSITE_TYPES.length);
  });

  it("SITE_TYPE_COPY defines a label plus 3 feature titles and 4 service titles for every type", () => {
    for (const type of WEBSITE_TYPES) {
      const copy = SITE_TYPE_COPY[type];
      expect(copy.label.length, `${type}.label`).toBeGreaterThan(0);
      expect(copy.featureTitles, `${type}.featureTitles`).toHaveLength(3);
      expect(copy.serviceTitles, `${type}.serviceTitles`).toHaveLength(4);
    }
  });

  it("siteTypeLabel() reads from SITE_TYPE_COPY for a known type", () => {
    const type: WebsiteType = "dental";
    expect(siteTypeLabel(type)).toBe(SITE_TYPE_COPY.dental.label);
    expect(siteTypeLabel(type)).toBe("Dental Clinic");
  });

  describe("resolvePalette() — 브랜드 컬러 오버라이드", () => {
    it("유효한 hex가 주어지면 primary/primaryDark만 교체하고 나머지는 siteType 기본값을 유지한다", () => {
      const palette = resolvePalette("dental", "#005BAC");
      expect(palette.primary).toBe("#005BAC");
      expect(palette.primaryDark).not.toBe(PALETTES.dental.primaryDark);
      expect(palette.primaryDark).toMatch(HEX_COLOR);
      expect(palette.secondary).toBe(PALETTES.dental.secondary);
      expect(palette.accent).toBe(PALETTES.dental.accent);
      expect(palette.background).toBe(PALETTES.dental.background);
    });

    it("오버라이드가 없거나 형식이 올바르지 않으면 siteType 기본 팔레트를 그대로 반환한다", () => {
      expect(resolvePalette("restaurant", undefined)).toEqual(PALETTES.restaurant);
      expect(resolvePalette("restaurant", "")).toEqual(PALETTES.restaurant);
      expect(resolvePalette("restaurant", "파란색")).toEqual(PALETTES.restaurant);
      expect(resolvePalette("restaurant", "#fff")).toEqual(PALETTES.restaurant);
      expect(resolvePalette("restaurant", "005bac")).toEqual(PALETTES.restaurant);
    });

    it("앞뒤 공백은 다듬고 대소문자 상관없이 유효한 hex로 인식한다", () => {
      const palette = resolvePalette("shopping", "  #ABCDEF  ");
      expect(palette.primary).toBe("#ABCDEF");
      expect(palette.primaryDark).not.toBe(PALETTES.shopping.primaryDark);
    });
  });
});
