import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integration coverage for proxy.ts (release hardening, v1.0 — RBAC route protection).
 * proxy.ts's resolveSessionUser() call reads from lib/auth/{session,users}.ts's default
 * baseDir (process.cwd()/lib/data) — there is no way to inject a test baseDir through the
 * request/response signature Next.js requires of a middleware/proxy function. So this suite
 * points DEFAULT_BASE_DIR-dependent state at an isolated temp directory by mocking
 * `@/lib/auth/middleware`'s resolveSessionUser() directly instead of hitting real session
 * files — the role matrix and area-resolution logic underneath (lib/auth/rbac.ts) already has
 * full unit coverage in tests/auth/rbac.test.ts; this file verifies proxy.ts wires that logic
 * into the right NextResponse for each case.
 */

const resolveSessionUserMock = vi.fn();

vi.mock("@/lib/auth/middleware", async () => {
  const actual = await vi.importActual<typeof import("../../lib/auth/middleware")>(
    "../../lib/auth/middleware"
  );
  return {
    ...actual,
    resolveSessionUser: (...args: unknown[]) => resolveSessionUserMock(...args),
  };
});

import { proxy } from "../../proxy";
import type { PublicUser } from "../../lib/auth/types";

function userWithRole(role: PublicUser["role"]): PublicUser {
  return { id: `user-${role}`, email: `${role}@example.com`, role };
}

describe("proxy() — route protection (proxy.ts, release hardening v1.0)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-test-"));
    resolveSessionUserMock.mockReset();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("/developer/** page requests", () => {
    it("redirects to /login with a redirect target when there is no session", async () => {
      resolveSessionUserMock.mockReturnValue(null);
      const response = await proxy(new NextRequest("http://localhost/developer/terminal"));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("redirect")).toBe("/developer/terminal");
    });

    it("returns 403 for a logged-in 'user' role", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("user"));
      const response = await proxy(new NextRequest("http://localhost/developer"));
      expect(response.status).toBe(403);
    });

    it("returns 403 for a logged-in 'admin' role", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("admin"));
      const response = await proxy(new NextRequest("http://localhost/developer"));
      expect(response.status).toBe(403);
    });

    it("allows a 'developer' role through", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("developer"));
      const response = await proxy(new NextRequest("http://localhost/developer"));
      expect(response.status).toBe(200); // NextResponse.next()
    });

    it("allows a 'super_admin' role through", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("super_admin"));
      const response = await proxy(new NextRequest("http://localhost/developer"));
      expect(response.status).toBe(200);
    });
  });

  describe("/admin/** page requests (no pages exist yet, but the rule is ready)", () => {
    it("returns 403 for a logged-in 'developer' role", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("developer"));
      const response = await proxy(new NextRequest("http://localhost/admin"));
      expect(response.status).toBe(403);
    });

    it("allows an 'admin' role through", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("admin"));
      const response = await proxy(new NextRequest("http://localhost/admin"));
      expect(response.status).toBe(200);
    });

    it("allows a 'super_admin' role through", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("super_admin"));
      const response = await proxy(new NextRequest("http://localhost/admin"));
      expect(response.status).toBe(200);
    });
  });

  describe("gated /api/** requests", () => {
    it("returns 401 JSON (not a redirect) when there is no session", async () => {
      resolveSessionUserMock.mockReturnValue(null);
      const response = await proxy(new NextRequest("http://localhost/api/design/requirements"));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it("returns 403 JSON for a role without developer access", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("user"));
      const response = await proxy(new NextRequest("http://localhost/api/websites"));

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it("allows a developer role through to a gated API route", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("developer"));
      const response = await proxy(new NextRequest("http://localhost/api/metrics"));
      expect(response.status).toBe(200);
    });
  });

  describe("ungated /api/** exceptions", () => {
    it("lets /api/auth/login through with no session (must stay reachable to log in)", async () => {
      resolveSessionUserMock.mockReturnValue(null);
      const response = await proxy(new NextRequest("http://localhost/api/auth/login"));
      expect(response.status).toBe(200);
    });

    it("lets /api/terminal through even for a 'user' role (documented CLI-compat exception)", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("user"));
      const response = await proxy(new NextRequest("http://localhost/api/terminal"));
      expect(response.status).toBe(200);
    });

    it("lets /api/devserver/status through with no session", async () => {
      resolveSessionUserMock.mockReturnValue(null);
      const response = await proxy(new NextRequest("http://localhost/api/devserver/status"));
      expect(response.status).toBe(200);
    });

    it("lets /api/contact through with no session (public contact form, anonymous visitors)", async () => {
      resolveSessionUserMock.mockReturnValue(null);
      const response = await proxy(new NextRequest("http://localhost/api/contact"));
      expect(response.status).toBe(200);
    });
  });

  describe("/projects (login required, no specific role)", () => {
    it("redirects to /login when there is no session", async () => {
      resolveSessionUserMock.mockReturnValue(null);
      const response = await proxy(new NextRequest("http://localhost/projects"));
      expect(response.status).toBe(307);
    });

    it("allows a plain 'user' role through (out of RBAC scope)", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("user"));
      const response = await proxy(new NextRequest("http://localhost/projects"));
      expect(response.status).toBe(200);
    });
  });

  describe("/login redirect-when-already-authenticated", () => {
    it("sends a developer to /developer", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("developer"));
      const response = await proxy(new NextRequest("http://localhost/login"));
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/developer");
    });

    it("sends an admin to /admin", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("admin"));
      const response = await proxy(new NextRequest("http://localhost/login"));
      expect(new URL(response.headers.get("location")!).pathname).toBe("/admin");
    });

    it("sends a plain user to the public home page", async () => {
      resolveSessionUserMock.mockReturnValue(userWithRole("user"));
      const response = await proxy(new NextRequest("http://localhost/login"));
      expect(new URL(response.headers.get("location")!).pathname).toBe("/");
    });

    it("does not redirect an anonymous visitor away from /login", async () => {
      resolveSessionUserMock.mockReturnValue(null);
      const response = await proxy(new NextRequest("http://localhost/login"));
      expect(response.status).toBe(200);
    });
  });

  describe("public marketing pages", () => {
    it("are never gated, logged in or not", async () => {
      resolveSessionUserMock.mockReturnValue(null);
      expect((await proxy(new NextRequest("http://localhost/"))).status).toBe(200);
      expect((await proxy(new NextRequest("http://localhost/about"))).status).toBe(200);
    });
  });
});
