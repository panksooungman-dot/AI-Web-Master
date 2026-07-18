import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createUser, findUserByEmail, findUserById, setUserRole, toPublicUser } from "../../lib/auth/users";
import { createFsStore } from "../../lib/db/fsStore";

describe("Auth — user registry (lib/auth/users.ts)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-users-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createUser() then findUserByEmail() round-trips the same record", async () => {
    const created = await createUser("Test@Example.com", "hunter2", "user", store);
    const found = await findUserByEmail("test@example.com", store);

    expect(found?.id).toBe(created.id);
    expect(found?.email).toBe("test@example.com");
  });

  it("findUserById() finds the same record by id", async () => {
    const created = await createUser("id-lookup@example.com", "hunter2", "user", store);
    const found = await findUserById(created.id, store);

    expect(found?.email).toBe("id-lookup@example.com");
  });

  it("rejects a duplicate email", async () => {
    await createUser("dup@example.com", "hunter2", "user", store);
    await expect(createUser("dup@example.com", "another-password", "user", store)).rejects.toThrow();
  });

  it("never stores the password in plaintext", async () => {
    const created = await createUser("secure@example.com", "hunter2", "user", store);
    expect(created.passwordHash).not.toBe("hunter2");
    expect(created.passwordHash).toContain(":");
  });

  it("returns undefined for an unknown email or id", async () => {
    expect(await findUserByEmail("nobody@example.com", store)).toBeUndefined();
    expect(await findUserById("does-not-exist", store)).toBeUndefined();
  });

  describe("RBAC role (release hardening, v1.0)", () => {
    it("defaults a newly created user's role to 'user' when not specified", async () => {
      const created = await createUser("default-role@example.com", "hunter2", undefined, store);
      expect(created.role).toBe("user");
    });

    it("stores an explicitly assigned role", async () => {
      const created = await createUser("dev-role@example.com", "hunter2", "developer", store);
      expect(created.role).toBe("developer");
      expect((await findUserByEmail("dev-role@example.com", store))?.role).toBe("developer");
    });

    it("toPublicUser() defaults legacy records with no role field to 'user'", async () => {
      const created = await createUser("legacy@example.com", "hunter2", "admin", store);
      // Simulate a pre-RBAC record written before the `role` field existed.
      const legacy = { ...created, role: undefined } as unknown as Parameters<typeof toPublicUser>[0];
      expect(toPublicUser(legacy).role).toBe("user");
    });

    it("setUserRole() changes an existing user's role and persists it", async () => {
      await createUser("promote-me@example.com", "hunter2", "user", store);
      const updated = await setUserRole("promote-me@example.com", "super_admin", store);

      expect(updated?.role).toBe("super_admin");
      expect((await findUserByEmail("promote-me@example.com", store))?.role).toBe("super_admin");
    });

    it("setUserRole() returns null for an unknown email and does not throw", async () => {
      expect(await setUserRole("nobody@example.com", "admin", store)).toBeNull();
    });
  });
});
