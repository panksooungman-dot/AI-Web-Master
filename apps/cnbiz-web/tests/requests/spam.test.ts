import { describe, expect, it } from "vitest";
import { isHoneypotFilled } from "../../lib/requests/spam";

describe("Request spam protection — lib/requests/spam.ts", () => {
  describe("isHoneypotFilled()", () => {
    it("returns false when the website field is empty or absent", () => {
      expect(isHoneypotFilled({})).toBe(false);
      expect(isHoneypotFilled({ website: "" })).toBe(false);
      expect(isHoneypotFilled({ website: "   " })).toBe(false);
    });

    it("returns true when the website field is filled in (bot behavior)", () => {
      expect(isHoneypotFilled({ website: "http://spam.example" })).toBe(true);
    });

    it("does not confuse the real companyName field with the honeypot", () => {
      expect(isHoneypotFilled({ companyName: "Acme", website: "" })).toBe(false);
    });

    it("returns false for non-object input", () => {
      expect(isHoneypotFilled(null)).toBe(false);
      expect(isHoneypotFilled("string")).toBe(false);
    });
  });
});
