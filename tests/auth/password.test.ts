import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../lib/auth/password";

describe("Auth — password hashing (lib/auth/password.ts)", () => {
  it("hashes the same password differently each time (random salt)", () => {
    const a = hashPassword("correct horse battery staple");
    const b = hashPassword("correct horse battery staple");
    expect(a).not.toBe(b);
  });

  it("verifyPassword() returns true for the correct password", () => {
    const stored = hashPassword("hunter2");
    expect(verifyPassword("hunter2", stored)).toBe(true);
  });

  it("verifyPassword() returns false for a wrong password", () => {
    const stored = hashPassword("hunter2");
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("verifyPassword() returns false for a malformed stored value", () => {
    expect(verifyPassword("hunter2", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("hunter2", "")).toBe(false);
  });
});
