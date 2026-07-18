import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isProtectedPath, resolveSessionUser } from "../../lib/auth/middleware";
import { SESSION_COOKIE_NAME, createSession } from "../../lib/auth/session";
import { createUser } from "../../lib/auth/users";
import { createFsStore } from "../../lib/db/fsStore";

describe("Auth — route protection (lib/auth/middleware.ts)", () => {
  describe("isProtectedPath()", () => {
    // /developer and /admin moved to role-gated protection in lib/auth/rbac.ts
    // (release hardening, v1.0) — see tests/auth/rbac.test.ts. isProtectedPath() now only
    // covers "requires login, no specific role" paths (/projects).
    it("protects /projects and nested paths", () => {
      expect(isProtectedPath("/projects")).toBe(true);
      expect(isProtectedPath("/projects/abc")).toBe(true);
    });

    it("does not protect public marketing pages, /login, or /api/auth/me", () => {
      expect(isProtectedPath("/")).toBe(false);
      expect(isProtectedPath("/about")).toBe(false);
      expect(isProtectedPath("/login")).toBe(false);
      expect(isProtectedPath("/api/auth/me")).toBe(false);
    });

    it("does not match paths that merely start with the same characters", () => {
      expect(isProtectedPath("/developerish")).toBe(false);
      expect(isProtectedPath("/projectsish")).toBe(false);
    });
  });

  describe("resolveSessionUser()", () => {
    let baseDir: string;
    let store: ReturnType<typeof createFsStore>;

    beforeEach(() => {
      baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-middleware-test-"));
      store = createFsStore(baseDir);
    });

    afterEach(() => {
      fs.rmSync(baseDir, { recursive: true, force: true });
    });

    it("returns null when there is no session cookie", async () => {
      const request = new NextRequest("http://localhost/developer");
      expect(await resolveSessionUser(request, store)).toBeNull();
    });

    it("returns null for an invalid/unknown session cookie", async () => {
      const request = new NextRequest("http://localhost/developer", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=does-not-exist` },
      });
      expect(await resolveSessionUser(request, store)).toBeNull();
    });

    it("returns the user for a valid session cookie", async () => {
      const user = await createUser("middleware-user@example.com", "hunter2", "developer", store);
      const session = await createSession(user.id, store);

      const request = new NextRequest("http://localhost/developer", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${session.id}` },
      });

      const resolved = await resolveSessionUser(request, store);
      expect(resolved?.id).toBe(user.id);
      expect(resolved?.email).toBe("middleware-user@example.com");
      expect(resolved?.role).toBe("developer");
    });
  });
});
