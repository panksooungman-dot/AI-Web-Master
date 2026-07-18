import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCurrentUser, login, logout } from "../../lib/auth/auth";
import { createUser } from "../../lib/auth/users";
import { createFsStore } from "../../lib/db/fsStore";

describe("Auth — orchestration (lib/auth/auth.ts)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(async () => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-orchestration-test-"));
    store = createFsStore(baseDir);
    await createUser("user@example.com", "correct-password", "developer", store);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("login() succeeds with the correct credentials and returns a session", async () => {
    const result = await login("user@example.com", "correct-password", store);

    expect("error" in result).toBe(false);
    if ("error" in result) return; // narrow for TS
    expect(result.user.email).toBe("user@example.com");
    expect(result.user.role).toBe("developer");
    expect(result.session.userId).toBe(result.user.id);
  });

  it("login() fails with the same message for a wrong password and an unknown email", async () => {
    const wrongPassword = await login("user@example.com", "nope", store);
    const unknownEmail = await login("nobody@example.com", "whatever", store);

    expect("error" in wrongPassword).toBe(true);
    expect("error" in unknownEmail).toBe(true);
    if ("error" in wrongPassword && "error" in unknownEmail) {
      expect(wrongPassword.error).toBe(unknownEmail.error);
    }
  });

  it("getCurrentUser() resolves the user for a session created by login()", async () => {
    const result = await login("user@example.com", "correct-password", store);
    if ("error" in result) throw new Error("login should have succeeded");

    const user = await getCurrentUser(result.session.id, store);
    expect(user?.email).toBe("user@example.com");
  });

  it("getCurrentUser() returns null for an undefined session id", async () => {
    expect(await getCurrentUser(undefined, store)).toBeNull();
  });

  it("logout() destroys the session so getCurrentUser() no longer resolves it", async () => {
    const result = await login("user@example.com", "correct-password", store);
    if ("error" in result) throw new Error("login should have succeeded");

    await logout(result.session.id, store);

    expect(await getCurrentUser(result.session.id, store)).toBeNull();
  });
});
