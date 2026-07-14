import { describe, expect, it } from "vitest";
import { slugify, resolveSiteType } from "../../packages/cli/src/website/scaffold.js";

describe("Website Builder v2 — scaffold helpers (packages/cli/src/website/scaffold.ts)", () => {
  describe("slugify()", () => {
    it("lowercases and hyphenates a normal project name", () => {
      expect(slugify("My Dental Clinic")).toBe("my-dental-clinic");
    });

    it("collapses non-alphanumeric runs into a single hyphen", () => {
      expect(slugify("Acme, Inc. -- Web Site!!")).toBe("acme-inc-web-site");
    });

    it("strips leading/trailing hyphens produced by punctuation", () => {
      expect(slugify("  --Bright Smiles--  ")).toBe("bright-smiles");
    });

    it("falls back to \"website\" when nothing alphanumeric remains", () => {
      expect(slugify("!!!")).toBe("website");
      expect(slugify("   ")).toBe("website");
    });
  });

  describe("resolveSiteType()", () => {
    it("passes through a known type regardless of case/whitespace", () => {
      expect(resolveSiteType("dental")).toBe("dental");
      expect(resolveSiteType(" Dental ")).toBe("dental");
      expect(resolveSiteType("RESTAURANT")).toBe("restaurant");
    });

    it("falls back to \"website\" for an unknown type", () => {
      expect(resolveSiteType("spaceship")).toBe("website");
    });

    it("falls back to \"website\" when omitted", () => {
      expect(resolveSiteType(undefined)).toBe("website");
    });
  });
});
