import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GitHubApiError,
  createRepository,
  deleteRepository,
  isGitHubConfigured,
} from "../../lib/github/client";

describe("GitHub client — lib/github/client.ts (AI Business OS Rewiring Phase 3)", () => {
  const originalToken = process.env.GITHUB_TOKEN;
  const originalOwner = process.env.GITHUB_OWNER;

  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_OWNER;
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = originalToken;
    if (originalOwner === undefined) delete process.env.GITHUB_OWNER;
    else process.env.GITHUB_OWNER = originalOwner;
  });

  describe("isGitHubConfigured()", () => {
    it("is false when GITHUB_TOKEN is unset", () => {
      expect(isGitHubConfigured()).toBe(false);
    });

    it("is true when GITHUB_TOKEN is set", () => {
      process.env.GITHUB_TOKEN = "fake-token";
      expect(isGitHubConfigured()).toBe(true);
    });
  });

  describe("createRepository()", () => {
    it("throws GitHubApiError immediately without calling fetch when not configured", async () => {
      let fetchCalled = false;
      const fakeFetch = async () => {
        fetchCalled = true;
        throw new Error("should not be called");
      };

      await expect(createRepository({ name: "should-not-create" }, fakeFetch)).rejects.toThrow(GitHubApiError);
      expect(fetchCalled).toBe(false);
    });

    it("posts to /user/repos and returns the parsed repository when GITHUB_OWNER is unset", async () => {
      process.env.GITHUB_TOKEN = "fake-token";
      let calledUrl = "";
      let calledBody: Record<string, unknown> = {};

      const fakeFetch = async (url: string, init?: RequestInit) => {
        calledUrl = url;
        calledBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: 12345,
            name: "acme-restaurant-a1b2c3d4",
            full_name: "octocat/acme-restaurant-a1b2c3d4",
            html_url: "https://github.com/octocat/acme-restaurant-a1b2c3d4",
            clone_url: "https://github.com/octocat/acme-restaurant-a1b2c3d4.git",
            default_branch: "main",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await createRepository({ name: "acme-restaurant-a1b2c3d4", private: true }, fakeFetch);

      expect(calledUrl).toBe("https://api.github.com/user/repos");
      expect(calledBody.name).toBe("acme-restaurant-a1b2c3d4");
      expect(calledBody.private).toBe(true);
      expect(calledBody.auto_init).toBe(false);
      expect(result).toEqual({
        id: 12345,
        name: "acme-restaurant-a1b2c3d4",
        fullName: "octocat/acme-restaurant-a1b2c3d4",
        owner: "octocat",
        htmlUrl: "https://github.com/octocat/acme-restaurant-a1b2c3d4",
        cloneUrl: "https://github.com/octocat/acme-restaurant-a1b2c3d4.git",
        defaultBranch: "main",
      });
    });

    it("posts to /orgs/{owner}/repos when GITHUB_OWNER is set", async () => {
      process.env.GITHUB_TOKEN = "fake-token";
      process.env.GITHUB_OWNER = "cnbiz-customers";
      let calledUrl = "";

      const fakeFetch = async (url: string) => {
        calledUrl = url;
        return new Response(
          JSON.stringify({ id: 1, name: "x", full_name: "cnbiz-customers/x", html_url: "u", clone_url: "c" }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      };

      await createRepository({ name: "x" }, fakeFetch);
      expect(calledUrl).toBe("https://api.github.com/orgs/cnbiz-customers/repos");
    });

    it("throws GitHubApiError with the response status when GitHub returns a non-ok response", async () => {
      process.env.GITHUB_TOKEN = "fake-token";
      const fakeFetch = async () => new Response("name already exists", { status: 422 });

      await expect(createRepository({ name: "dup" }, fakeFetch)).rejects.toMatchObject({
        name: "GitHubApiError",
        status: 422,
      });
    });
  });

  describe("deleteRepository()", () => {
    it("returns failure without calling fetch when not configured", async () => {
      const result = await deleteRepository("octocat/x", async () => {
        throw new Error("should not be called");
      });
      expect(result.success).toBe(false);
    });

    it("succeeds on 204", async () => {
      process.env.GITHUB_TOKEN = "fake-token";
      const result = await deleteRepository("octocat/x", async () => new Response(null, { status: 204 }));
      expect(result.success).toBe(true);
    });

    it("treats 404 (already gone) as success", async () => {
      process.env.GITHUB_TOKEN = "fake-token";
      const result = await deleteRepository("octocat/x", async () => new Response("not found", { status: 404 }));
      expect(result.success).toBe(true);
    });

    it("returns failure with a message on other error statuses", async () => {
      process.env.GITHUB_TOKEN = "fake-token";
      const result = await deleteRepository("octocat/x", async () => new Response("forbidden", { status: 403 }));
      expect(result.success).toBe(false);
      expect(result.error).toContain("403");
    });

    it("returns failure when fetch throws (network error)", async () => {
      process.env.GITHUB_TOKEN = "fake-token";
      const result = await deleteRepository("octocat/x", async () => {
        throw new Error("network down");
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("network down");
    });
  });
});
