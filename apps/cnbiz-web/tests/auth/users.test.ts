import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createUser, findUserByEmail, findUserById, setUserRole, toPublicUser } from "../../lib/auth/users";

describe("Auth — user registry (lib/auth/users.ts)", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-users-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createUser() then findUserByEmail() round-trips the same record", () => {
    const created = createUser("Test@Example.com", "hunter2", "user", baseDir);
    const found = findUserByEmail("test@example.com", baseDir);

    expect(found?.id).toBe(created.id);
    expect(found?.email).toBe("test@example.com");
  });

  it("findUserById() finds the same record by id", () => {
    const created = createUser("id-lookup@example.com", "hunter2", "user", baseDir);
    const found = findUserById(created.id, baseDir);

    expect(found?.email).toBe("id-lookup@example.com");
  });

  it("rejects a duplicate email", () => {
    createUser("dup@example.com", "hunter2", "user", baseDir);
    expect(() => createUser("dup@example.com", "another-password", "user", baseDir)).toThrow();
  });

  it("never stores the password in plaintext", () => {
    const created = createUser("secure@example.com", "hunter2", "user", baseDir);
    expect(created.passwordHash).not.toBe("hunter2");
    expect(created.passwordHash).toContain(":");
  });

  it("returns undefined for an unknown email or id", () => {
    expect(findUserByEmail("nobody@example.com", baseDir)).toBeUndefined();
    expect(findUserById("does-not-exist", baseDir)).toBeUndefined();
  });

  describe("RBAC role (release hardening, v1.0)", () => {
    it("defaults a newly created user's role to 'user' when not specified", () => {
      const created = createUser("default-role@example.com", "hunter2", undefined, baseDir);
      expect(created.role).toBe("user");
    });

    it("stores an explicitly assigned role", () => {
      const created = createUser("dev-role@example.com", "hunter2", "developer", baseDir);
      expect(created.role).toBe("developer");
      expect(findUserByEmail("dev-role@example.com", baseDir)?.role).toBe("developer");
    });

    it("toPublicUser() defaults legacy records with no role field to 'user'", () => {
      const created = createUser("legacy@example.com", "hunter2", "admin", baseDir);
      // Simulate a pre-RBAC record written before the `role` field existed.
      const legacy = { ...created, role: undefined } as unknown as Parameters<typeof toPublicUser>[0];
      expect(toPublicUser(legacy).role).toBe("user");
    });

    it("setUserRole() changes an existing user's role and persists it", () => {
      createUser("promote-me@example.com", "hunter2", "user", baseDir);
      const updated = setUserRole("promote-me@example.com", "super_admin", baseDir);

      expect(updated?.role).toBe("super_admin");
      expect(findUserByEmail("promote-me@example.com", baseDir)?.role).toBe("super_admin");
    });

    it("setUserRole() returns null for an unknown email and does not throw", () => {
      expect(setUserRole("nobody@example.com", "admin", baseDir)).toBeNull();
    });
  });
});
