import { describe, expect, it } from "vitest";
import { parseClientUpdateInput, validateClientUpdateInput } from "../../lib/clients/validate";

describe("Client Update Validation — lib/clients/validate.ts", () => {
  it("parseClientUpdateInput() only includes fields actually sent", () => {
    expect(parseClientUpdateInput({ phone: "010-1234-5678" })).toEqual({ phone: "010-1234-5678" });
    expect(parseClientUpdateInput({})).toEqual({});
    expect(parseClientUpdateInput(null)).toEqual({});
  });

  it("parseClientUpdateInput() trims whitespace", () => {
    expect(parseClientUpdateInput({ companyName: "  Acme  " })).toEqual({ companyName: "Acme" });
  });

  it("validateClientUpdateInput() only checks fields present in the patch", () => {
    expect(validateClientUpdateInput({})).toEqual({});
    expect(validateClientUpdateInput({ phone: "010-1234-5678" })).toEqual({});
  });

  it("validateClientUpdateInput() rejects an empty company/contact name when sent", () => {
    expect(validateClientUpdateInput({ companyName: "" }).companyName).toBeDefined();
    expect(validateClientUpdateInput({ contactName: "" }).contactName).toBeDefined();
  });

  it("validateClientUpdateInput() validates email format when sent", () => {
    expect(validateClientUpdateInput({ email: "not-an-email" }).email).toBeDefined();
    expect(validateClientUpdateInput({ email: "" }).email).toBeDefined();
    expect(validateClientUpdateInput({ email: "jane@example.com" }).email).toBeUndefined();
  });

  it("validateClientUpdateInput() validates phone format only when non-empty", () => {
    expect(validateClientUpdateInput({ phone: "" }).phone).toBeUndefined();
    expect(validateClientUpdateInput({ phone: "abc" }).phone).toBeDefined();
    expect(validateClientUpdateInput({ phone: "010-1234-5678" }).phone).toBeUndefined();
  });
});
