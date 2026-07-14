import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCurrentUser, login, logout } from "../../lib/auth/auth";
import { createUser } from "../../lib/auth/users";

describe("Auth — orchestration (lib/auth/auth.ts)", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-orchestration-test-"));
    createUser("user@example.com", "correct-password", baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("login() succeeds with the correct credentials and returns a session", () => {
    const result = login("user@example.com", "correct-password", baseDir);

    expect("error" in result).toBe(false);
    if ("error" in result) return; // narrow for TS
    expect(result.user.email).toBe("user@example.com");
    expect(result.session.userId).toBe(result.user.id);
  });

  it("login() fails with the same message for a wrong password and an unknown email", () => {
    const wrongPassword = login("user@example.com", "nope", baseDir);
    const unknownEmail = login("nobody@example.com", "whatever", baseDir);

    expect("error" in wrongPassword).toBe(true);
    expect("error" in unknownEmail).toBe(true);
    if ("error" in wrongPassword && "error" in unknownEmail) {
      expect(wrongPassword.error).toBe(unknownEmail.error);
    }
  });

  it("getCurrentUser() resolves the user for a session created by login()", () => {
    const result = login("user@example.com", "correct-password", baseDir);
    if ("error" in result) throw new Error("login should have succeeded");

    const user = getCurrentUser(result.session.id, baseDir);
    expect(user?.email).toBe("user@example.com");
  });

  it("getCurrentUser() returns null for an undefined session id", () => {
    expect(getCurrentUser(undefined, baseDir)).toBeNull();
  });

  it("logout() destroys the session so getCurrentUser() no longer resolves it", () => {
    const result = login("user@example.com", "correct-password", baseDir);
    if ("error" in result) throw new Error("login should have succeeded");

    logout(result.session.id, baseDir);

    expect(getCurrentUser(result.session.id, baseDir)).toBeNull();
  });
});
