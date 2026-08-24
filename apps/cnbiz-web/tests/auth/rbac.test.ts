import { describe, expect, it } from "vitest";
import {
  defaultLandingPathForRole,
  resolveProtectedArea,
  roleCanAccessArea,
} from "../../lib/auth/rbac";
import type { Role } from "../../lib/auth/types";
import { ROLES, isRole } from "../../lib/auth/types";

const ALL_ROLES: Role[] = ["user", "admin", "developer", "super_admin", "customer"];

describe("RBAC — lib/auth/rbac.ts (release hardening, v1.0)", () => {
  describe("roleCanAccessArea() access matrix", () => {
    it("user has neither /developer nor /admin access", () => {
      expect(roleCanAccessArea("user", "developer")).toBe(false);
      expect(roleCanAccessArea("user", "admin")).toBe(false);
    });

    it("admin can access /admin only", () => {
      expect(roleCanAccessArea("admin", "admin")).toBe(true);
      expect(roleCanAccessArea("admin", "developer")).toBe(false);
    });

    it("developer can access /developer only", () => {
      expect(roleCanAccessArea("developer", "developer")).toBe(true);
      expect(roleCanAccessArea("developer", "admin")).toBe(false);
    });

    it("super_admin can access both areas", () => {
      expect(roleCanAccessArea("super_admin", "developer")).toBe(true);
      expect(roleCanAccessArea("super_admin", "admin")).toBe(true);
    });

    it("customer can access the customer area only (Customer Portal V1)", () => {
      expect(roleCanAccessArea("customer", "customer")).toBe(true);
      expect(roleCanAccessArea("customer", "developer")).toBe(false);
      expect(roleCanAccessArea("customer", "admin")).toBe(false);
    });

    it("developer/admin/user cannot access the customer area", () => {
      expect(roleCanAccessArea("developer", "customer")).toBe(false);
      expect(roleCanAccessArea("admin", "customer")).toBe(false);
      expect(roleCanAccessArea("user", "customer")).toBe(false);
    });

    it("super_admin can also access the customer area", () => {
      expect(roleCanAccessArea("super_admin", "customer")).toBe(true);
    });
  });

  describe("resolveProtectedArea() — page routes", () => {
    it("resolves /developer and nested paths to the developer area", () => {
      expect(resolveProtectedArea("/developer")).toBe("developer");
      expect(resolveProtectedArea("/developer/terminal")).toBe("developer");
      expect(resolveProtectedArea("/developer/design/website")).toBe("developer");
    });

    it("resolves /admin and nested paths to the admin area (no /admin pages exist yet, but the rule is ready)", () => {
      expect(resolveProtectedArea("/admin")).toBe("admin");
      expect(resolveProtectedArea("/admin/users")).toBe("admin");
    });

    it("resolves /customer and nested paths to the customer area (Customer Portal V1)", () => {
      expect(resolveProtectedArea("/customer")).toBe("customer");
      expect(resolveProtectedArea("/customer/dashboard")).toBe("customer");
      expect(resolveProtectedArea("/customer/orders")).toBe("customer");
      expect(resolveProtectedArea("/customer/orders/abc123")).toBe("customer");
    });

    it("does not match paths that merely start with the same characters", () => {
      expect(resolveProtectedArea("/developerish")).toBeNull();
      expect(resolveProtectedArea("/adminland")).toBeNull();
      expect(resolveProtectedArea("/customerservice")).toBeNull();
    });

    it("does not gate /projects, public marketing pages, or /login", () => {
      expect(resolveProtectedArea("/projects")).toBeNull();
      expect(resolveProtectedArea("/projects/abc")).toBeNull();
      expect(resolveProtectedArea("/")).toBeNull();
      expect(resolveProtectedArea("/about")).toBeNull();
      expect(resolveProtectedArea("/login")).toBeNull();
    });
  });

  describe("resolveProtectedArea() — API routes", () => {
    it("treats /api/admin/** as the admin area", () => {
      expect(resolveProtectedArea("/api/admin")).toBe("admin");
      expect(resolveProtectedArea("/api/admin/users")).toBe("admin");
    });

    it("treats /api/customer/** as the customer area, not the developer catch-all (Customer Portal V1)", () => {
      expect(resolveProtectedArea("/api/customer/orders")).toBe("customer");
      expect(resolveProtectedArea("/api/customer/orders/abc123")).toBe("customer");
    });

    it("treats other dashboard API routes as the developer area", () => {
      expect(resolveProtectedArea("/api/design/requirements")).toBe("developer");
      expect(resolveProtectedArea("/api/websites")).toBe("developer");
      expect(resolveProtectedArea("/api/agents/tasks")).toBe("developer");
      expect(resolveProtectedArea("/api/metrics")).toBe("developer");
    });

    it("leaves /api/dev-inspector/** ungated (Visual Editor save-text/save-image/save-style/open-in-editor — used unauthenticated on public page previews by a local developer; each handler already self-gates on NODE_ENV !== 'development', so requiring a login too just breaks the real usage path, as reproduced against a running dev server)", () => {
      expect(resolveProtectedArea("/api/dev-inspector/save-text")).toBeNull();
      expect(resolveProtectedArea("/api/dev-inspector/save-image")).toBeNull();
      expect(resolveProtectedArea("/api/dev-inspector/save-style")).toBeNull();
      expect(resolveProtectedArea("/api/dev-inspector/open-in-editor")).toBeNull();
    });

    it("leaves /api/auth/** ungated (must stay reachable to log in at all)", () => {
      expect(resolveProtectedArea("/api/auth/login")).toBeNull();
      expect(resolveProtectedArea("/api/auth/logout")).toBeNull();
      expect(resolveProtectedArea("/api/auth/me")).toBeNull();
    });

    it("leaves /api/workspaces and /api/terminal out of role-gating (Release Blocker fix: they are called by /projects and /projects/[id] for any authenticated role — see lib/auth/middleware.ts's PROTECTED_PREFIXES for the login-only gate that now covers them instead)", () => {
      expect(resolveProtectedArea("/api/workspaces")).toBeNull();
      expect(resolveProtectedArea("/api/terminal")).toBeNull();
    });

    it("no longer leaves /api/devserver ungated (Release Blocker fix: its only caller is /developer's DevServerManagerCard, developer role only — falls through to the developer-gated default)", () => {
      expect(resolveProtectedArea("/api/devserver/status")).toBe("developer");
      expect(resolveProtectedArea("/api/devserver/start")).toBe("developer");
    });

    it("leaves /api/projects ungated (backs /projects, which is outside RBAC scope)", () => {
      expect(resolveProtectedArea("/api/projects")).toBeNull();
      expect(resolveProtectedArea("/api/projects/abc")).toBeNull();
    });

    it("no longer has /api/contact as an ungated exception (the public Contact form/route were removed — CNBIZ.KR no longer takes requests directly)", () => {
      expect(resolveProtectedArea("/api/contact")).toBe("developer");
    });

    it("no longer has /api/requests/submit as an ungated exception (the public /request form/route were removed); /api/requests and /api/requests/[id] stay admin-gated (customer PII)", () => {
      expect(resolveProtectedArea("/api/requests/submit")).toBe("developer");
      expect(resolveProtectedArea("/api/requests")).toBe("developer");
      expect(resolveProtectedArea("/api/requests/abc123")).toBe("developer");
    });

    it("leaves /api/external/** ungated (server-to-server chatbot ingestion, authenticated via verifyExternalApiKey() instead of a session)", () => {
      expect(resolveProtectedArea("/api/external/inquiries")).toBeNull();
    });

    it("keeps the Inquiry/Client/WebsiteOrder/AiJob admin read/manage APIs developer-gated by default (customer PII, not listed in UNGATED_API_PREFIXES)", () => {
      expect(resolveProtectedArea("/api/inquiries")).toBe("developer");
      expect(resolveProtectedArea("/api/inquiries/abc123")).toBe("developer");
      expect(resolveProtectedArea("/api/clients")).toBe("developer");
      expect(resolveProtectedArea("/api/clients/abc123")).toBe("developer");
      expect(resolveProtectedArea("/api/website-orders")).toBe("developer");
      expect(resolveProtectedArea("/api/website-orders/abc123")).toBe("developer");
      expect(resolveProtectedArea("/api/ai-jobs")).toBe("developer");
      expect(resolveProtectedArea("/api/ai-jobs/abc123")).toBe("developer");
    });

    it("(AI Business OS Rewiring) ungates exactly POST /api/inquiries — the new internal customer-intake entry point — while every other method/path on the same admin API stays developer-gated", () => {
      expect(resolveProtectedArea("/api/inquiries", "POST")).toBeNull();
      expect(resolveProtectedArea("/api/inquiries", "GET")).toBe("developer");
      expect(resolveProtectedArea("/api/inquiries")).toBe("developer");
      expect(resolveProtectedArea("/api/inquiries/abc123", "POST")).toBe("developer");
      expect(resolveProtectedArea("/api/inquiries/abc123", "PATCH")).toBe("developer");
    });
  });

  describe("defaultLandingPathForRole()", () => {
    it("sends developer and super_admin to /developer", () => {
      expect(defaultLandingPathForRole("developer")).toBe("/developer");
      expect(defaultLandingPathForRole("super_admin")).toBe("/developer");
    });

    it("sends admin to /admin", () => {
      expect(defaultLandingPathForRole("admin")).toBe("/admin");
    });

    it("sends user to the public home page", () => {
      expect(defaultLandingPathForRole("user")).toBe("/");
    });

    it("sends customer to /customer/dashboard (Customer Portal V1)", () => {
      expect(defaultLandingPathForRole("customer")).toBe("/customer/dashboard");
    });
  });

  describe("full role x area matrix (spec: user 403 all, admin admin-only, developer developer-only, customer customer-only, super_admin all three)", () => {
    const expected: Record<Role, { developer: boolean; admin: boolean; customer: boolean }> = {
      user: { developer: false, admin: false, customer: false },
      admin: { developer: false, admin: true, customer: false },
      developer: { developer: true, admin: false, customer: false },
      super_admin: { developer: true, admin: true, customer: true },
      customer: { developer: false, admin: false, customer: true },
    };

    for (const role of ALL_ROLES) {
      it(`role "${role}" matches the spec exactly`, () => {
        expect(roleCanAccessArea(role, "developer")).toBe(expected[role].developer);
        expect(roleCanAccessArea(role, "admin")).toBe(expected[role].admin);
        expect(roleCanAccessArea(role, "customer")).toBe(expected[role].customer);
      });
    }
  });
});

describe("Role type guard — lib/auth/types.ts", () => {
  it("isRole() accepts exactly the 4 defined roles", () => {
    for (const role of ROLES) {
      expect(isRole(role)).toBe(true);
    }
  });

  it("isRole() rejects unknown strings and non-strings", () => {
    expect(isRole("superadmin")).toBe(false);
    expect(isRole("")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(42)).toBe(false);
  });
});
