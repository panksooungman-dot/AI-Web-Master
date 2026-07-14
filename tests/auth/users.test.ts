import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createUser, findUserByEmail, findUserById } from "../../lib/auth/users";

describe("Auth — user registry (lib/auth/users.ts)", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-users-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createUser() then findUserByEmail() round-trips the same record", () => {
    const created = createUser("Test@Example.com", "hunter2", baseDir);
    const found = findUserByEmail("test@example.com", baseDir);

    expect(found?.id).toBe(created.id);
    expect(found?.email).toBe("test@example.com");
  });

  it("findUserById() finds the same record by id", () => {
    const created = createUser("id-lookup@example.com", "hunter2", baseDir);
    const found = findUserById(created.id, baseDir);

    expect(found?.email).toBe("id-lookup@example.com");
  });

  it("rejects a duplicate email", () => {
    createUser("dup@example.com", "hunter2", baseDir);
    expect(() => createUser("dup@example.com", "another-password", baseDir)).toThrow();
  });

  it("never stores the password in plaintext", () => {
    const created = createUser("secure@example.com", "hunter2", baseDir);
    expect(created.passwordHash).not.toBe("hunter2");
    expect(created.passwordHash).toContain(":");
  });

  it("returns undefined for an unknown email or id", () => {
    expect(findUserByEmail("nobody@example.com", baseDir)).toBeUndefined();
    expect(findUserById("does-not-exist", baseDir)).toBeUndefined();
  });
});
