import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  VercelApiError,
  createDeployment,
  createProject,
  deleteProject,
  isVercelConfigured,
  linkGitRepository,
} from "../../lib/vercel/client";

describe("Vercel client — lib/vercel/client.ts (AI Business OS Rewiring Phase 3)", () => {
  const originalToken = process.env.VERCEL_TOKEN;
  const originalTeam = process.env.VERCEL_TEAM_ID;

  beforeEach(() => {
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_TEAM_ID;
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.VERCEL_TOKEN;
    else process.env.VERCEL_TOKEN = originalToken;
    if (originalTeam === undefined) delete process.env.VERCEL_TEAM_ID;
    else process.env.VERCEL_TEAM_ID = originalTeam;
  });

  describe("isVercelConfigured()", () => {
    it("is false when VERCEL_TOKEN is unset", () => {
      expect(isVercelConfigured()).toBe(false);
    });

    it("is true when VERCEL_TOKEN is set", () => {
      process.env.VERCEL_TOKEN = "fake-token";
      expect(isVercelConfigured()).toBe(true);
    });
  });

  describe("createProject()", () => {
    it("throws VercelApiError immediately without calling fetch when not configured", async () => {
      let called = false;
      await expect(
        createProject("x", async () => {
          called = true;
          throw new Error("should not be called");
        })
      ).rejects.toThrow(VercelApiError);
      expect(called).toBe(false);
    });

    it("posts to /v10/projects and returns the parsed project", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      let calledUrl = "";

      const fakeFetch = async (url: string) => {
        calledUrl = url;
        return new Response(JSON.stringify({ id: "prj_123", name: "restaurant-a1b2c3d4" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const result = await createProject("restaurant-a1b2c3d4", fakeFetch);

      expect(calledUrl).toBe("https://api.vercel.com/v10/projects");
      expect(result).toEqual({ id: "prj_123", name: "restaurant-a1b2c3d4" });
    });

    it("appends ?teamId= when VERCEL_TEAM_ID is set", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      process.env.VERCEL_TEAM_ID = "team_abc";
      let calledUrl = "";

      const fakeFetch = async (url: string) => {
        calledUrl = url;
        return new Response(JSON.stringify({ id: "prj_1", name: "n" }), { status: 200 });
      };

      await createProject("n", fakeFetch);
      expect(calledUrl).toBe("https://api.vercel.com/v10/projects?teamId=team_abc");
    });

    it("throws VercelApiError with the response status on failure", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      const fakeFetch = async () => new Response("name taken", { status: 409 });

      await expect(createProject("dup", fakeFetch)).rejects.toMatchObject({ name: "VercelApiError", status: 409 });
    });
  });

  describe("linkGitRepository()", () => {
    it("returns failure without calling fetch when not configured", async () => {
      const result = await linkGitRepository("prj_1", "owner/repo", async () => {
        throw new Error("should not be called");
      });
      expect(result.success).toBe(false);
    });

    it("succeeds when the link endpoint returns ok", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      let calledUrl = "";
      let calledBody: Record<string, unknown> = {};

      const fakeFetch = async (url: string, init?: RequestInit) => {
        calledUrl = url;
        calledBody = JSON.parse(String(init?.body));
        return new Response(null, { status: 200 });
      };

      const result = await linkGitRepository("prj_1", "cnbiz-customers/restaurant-a1b2c3d4", fakeFetch);

      expect(result.success).toBe(true);
      expect(calledUrl).toBe("https://api.vercel.com/v9/projects/prj_1/link");
      expect(calledBody).toEqual({ type: "github", repo: "cnbiz-customers/restaurant-a1b2c3d4" });
    });

    it("returns failure with a message when the link endpoint fails", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      const result = await linkGitRepository("prj_1", "owner/repo", async () => new Response("bad", { status: 400 }));
      expect(result.success).toBe(false);
      expect(result.error).toContain("400");
    });
  });

  describe("createDeployment()", () => {
    it("throws VercelApiError immediately without calling fetch when not configured", async () => {
      await expect(
        createDeployment({ name: "x", projectId: "prj_1" }, async () => {
          throw new Error("should not be called");
        })
      ).rejects.toThrow(VercelApiError);
    });

    it("posts a production deployment with gitSource and returns a full https URL", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      let calledBody: Record<string, unknown> = {};

      const fakeFetch = async (_url: string, init?: RequestInit) => {
        calledBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ id: "dpl_123", url: "restaurant-a1b2c3d4.vercel.app", readyState: "QUEUED" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await createDeployment({ name: "restaurant-a1b2c3d4", projectId: "prj_1", gitBranch: "main" }, fakeFetch);

      expect(calledBody).toMatchObject({
        name: "restaurant-a1b2c3d4",
        project: "prj_1",
        target: "production",
        gitSource: { type: "github", ref: "main" },
      });
      expect(result).toEqual({ id: "dpl_123", url: "https://restaurant-a1b2c3d4.vercel.app", readyState: "QUEUED" });
    });

    it("defaults gitBranch to main when not provided", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      let calledBody: Record<string, unknown> = {};

      const fakeFetch = async (_url: string, init?: RequestInit) => {
        calledBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ id: "dpl_1", url: "x.vercel.app" }), { status: 200 });
      };

      await createDeployment({ name: "x", projectId: "prj_1" }, fakeFetch);
      expect((calledBody.gitSource as { ref: string }).ref).toBe("main");
    });

    it("throws VercelApiError with the response status on failure", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      const fakeFetch = async () => new Response("build failed", { status: 500 });

      await expect(createDeployment({ name: "x", projectId: "prj_1" }, fakeFetch)).rejects.toMatchObject({
        name: "VercelApiError",
        status: 500,
      });
    });
  });

  describe("deleteProject()", () => {
    it("returns failure without calling fetch when not configured", async () => {
      const result = await deleteProject("prj_1", async () => {
        throw new Error("should not be called");
      });
      expect(result.success).toBe(false);
    });

    it("succeeds on 204", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      const result = await deleteProject("prj_1", async () => new Response(null, { status: 204 }));
      expect(result.success).toBe(true);
    });

    it("treats 404 (already gone) as success", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      const result = await deleteProject("prj_1", async () => new Response("not found", { status: 404 }));
      expect(result.success).toBe(true);
    });

    it("returns failure when fetch throws (network error)", async () => {
      process.env.VERCEL_TOKEN = "fake-token";
      const result = await deleteProject("prj_1", async () => {
        throw new Error("network down");
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("network down");
    });
  });
});
