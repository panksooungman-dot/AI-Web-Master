import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isProtectedPath, resolveSessionUser } from "../../lib/auth/middleware";
import { SESSION_COOKIE_NAME, createSession } from "../../lib/auth/session";
import { createUser } from "../../lib/auth/users";

describe("Auth — route protection (lib/auth/middleware.ts)", () => {
  describe("isProtectedPath()", () => {
    it("protects /developer and nested paths", () => {
      expect(isProtectedPath("/developer")).toBe(true);
      expect(isProtectedPath("/developer/terminal")).toBe(true);
      expect(isProtectedPath("/developer/workspace")).toBe(true);
    });

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

    beforeEach(() => {
      baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-middleware-test-"));
    });

    afterEach(() => {
      fs.rmSync(baseDir, { recursive: true, force: true });
    });

    it("returns null when there is no session cookie", () => {
      const request = new NextRequest("http://localhost/developer");
      expect(resolveSessionUser(request, baseDir)).toBeNull();
    });

    it("returns null for an invalid/unknown session cookie", () => {
      const request = new NextRequest("http://localhost/developer", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=does-not-exist` },
      });
      expect(resolveSessionUser(request, baseDir)).toBeNull();
    });

    it("returns the user for a valid session cookie", () => {
      const user = createUser("middleware-user@example.com", "hunter2", baseDir);
      const session = createSession(user.id, baseDir);

      const request = new NextRequest("http://localhost/developer", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${session.id}` },
      });

      const resolved = resolveSessionUser(request, baseDir);
      expect(resolved?.id).toBe(user.id);
      expect(resolved?.email).toBe("middleware-user@example.com");
    });
  });
});
