import { describe, expect, it } from "vitest";
import { parseInquiryInput, validateInquiryInput } from "../../lib/inquiries/validate";

describe("Inquiry validate — lib/inquiries/validate.ts", () => {
  it("parseInquiryInput() defaults source to 'chatbot' and coerces missing fields to empty strings", () => {
    const input = parseInquiryInput({ contactName: "Jane", email: "jane@example.com" });
    expect(input.source).toBe("chatbot");
    expect(input.companyName).toBe("");
    expect(input.contactName).toBe("Jane");
    expect(input.email).toBe("jane@example.com");
    expect(input.budget).toBeUndefined();
  });

  it("parseInquiryInput() keeps a valid explicit source", () => {
    expect(parseInquiryInput({ source: "manual" }).source).toBe("manual");
  });

  it("parseInquiryInput() falls back to 'chatbot' for an invalid source", () => {
    expect(parseInquiryInput({ source: "not-a-real-source" }).source).toBe("chatbot");
  });

  it("validateInquiryInput() requires contactName, email, requirements only", () => {
    const errors = validateInquiryInput(
      parseInquiryInput({ contactName: "", email: "", requirements: "" })
    );
    expect(errors.contactName).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.requirements).toBeTruthy();
    expect(errors.companyName).toBeUndefined();
    expect(errors.phone).toBeUndefined();
  });

  it("validateInquiryInput() flags an invalid email format", () => {
    const input = parseInquiryInput({ contactName: "Jane", email: "not-an-email", requirements: "요구사항" });
    expect(validateInquiryInput(input).email).toBeTruthy();
  });

  it("validateInquiryInput() flags an invalid phone only when phone is present", () => {
    const withBadPhone = parseInquiryInput({
      contactName: "Jane",
      email: "jane@example.com",
      requirements: "요구사항",
      phone: "abc",
    });
    expect(validateInquiryInput(withBadPhone).phone).toBeTruthy();

    const withoutPhone = parseInquiryInput({
      contactName: "Jane",
      email: "jane@example.com",
      requirements: "요구사항",
    });
    expect(validateInquiryInput(withoutPhone).phone).toBeUndefined();
  });

  it("validateInquiryInput() returns no errors for a minimal valid input", () => {
    const input = parseInquiryInput({
      contactName: "Jane",
      email: "jane@example.com",
      requirements: "모던한 느낌의 홈페이지를 원합니다.",
    });
    expect(validateInquiryInput(input)).toEqual({});
  });
});
