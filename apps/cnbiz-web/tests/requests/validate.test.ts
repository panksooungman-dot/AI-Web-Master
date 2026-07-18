import { describe, expect, it } from "vitest";
import { parseRequestInput, validateRequestInput } from "../../lib/requests/validate";

describe("Request validation — lib/requests/validate.ts", () => {
  describe("parseRequestInput()", () => {
    it("trims strings and defaults missing fields to empty values", () => {
      const input = parseRequestInput({
        companyName: "  Acme  ",
        contactName: "Jane",
        email: " jane@example.com ",
      });

      expect(input.companyName).toBe("Acme");
      expect(input.contactName).toBe("Jane");
      expect(input.email).toBe("jane@example.com");
      expect(input.phone).toBe("");
      expect(input.features).toEqual([]);
    });

    it("filters non-string entries out of features and drops blank strings", () => {
      const input = parseRequestInput({
        features: ["온라인 예약", "", 123, null, "결제 시스템"],
      });

      expect(input.features).toEqual(["온라인 예약", "결제 시스템"]);
    });

    it("returns all-empty defaults for non-object input", () => {
      expect(parseRequestInput(null)).toEqual({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        industry: "",
        siteType: "",
        features: [],
        referenceSites: "",
        budget: "",
        message: "",
      });
    });
  });

  describe("validateRequestInput()", () => {
    const VALID = {
      companyName: "Acme",
      contactName: "Jane",
      email: "jane@example.com",
      phone: "010-1234-5678",
      industry: "IT/소프트웨어",
      siteType: "기업 소개 사이트",
      features: [],
      referenceSites: "",
      budget: "",
      message: "홈페이지 제작을 의뢰합니다.",
    };

    it("passes with no errors for fully valid input", () => {
      expect(validateRequestInput(VALID)).toEqual({});
    });

    it("requires companyName, contactName, industry, siteType, and message", () => {
      const errors = validateRequestInput({
        ...VALID,
        companyName: "",
        contactName: "",
        industry: "",
        siteType: "",
        message: "",
      });

      expect(errors.companyName).toBeTruthy();
      expect(errors.contactName).toBeTruthy();
      expect(errors.industry).toBeTruthy();
      expect(errors.siteType).toBeTruthy();
      expect(errors.message).toBeTruthy();
    });

    it("requires a valid email format", () => {
      expect(validateRequestInput({ ...VALID, email: "" }).email).toBeTruthy();
      expect(validateRequestInput({ ...VALID, email: "not-an-email" }).email).toBeTruthy();
      expect(validateRequestInput({ ...VALID, email: "ok@example.com" }).email).toBeUndefined();
    });

    it("requires a valid phone format", () => {
      expect(validateRequestInput({ ...VALID, phone: "" }).phone).toBeTruthy();
      expect(validateRequestInput({ ...VALID, phone: "abc" }).phone).toBeTruthy();
      expect(validateRequestInput({ ...VALID, phone: "010-1234-5678" }).phone).toBeUndefined();
    });

    it("does not require features, referenceSites, or budget", () => {
      const errors = validateRequestInput({ ...VALID, features: [], referenceSites: "", budget: "" });
      expect(errors.features).toBeUndefined();
      expect(errors.referenceSites).toBeUndefined();
      expect(errors.budget).toBeUndefined();
    });
  });
});
