import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createWebsiteRecord, getWebsite } from "../../lib/websites/registry";
import { runDeploymentPipeline } from "../../lib/deployment/pipeline";
import type { DeploymentPipelineDeps } from "../../lib/deployment/pipeline";
import type { GitHubRepository } from "../../lib/github/types";
import type { VercelDeployment, VercelProject } from "../../lib/vercel/types";

const FAKE_REPO: GitHubRepository = {
  id: 1,
  name: "restaurant-a1b2c3d4",
  fullName: "cnbiz-customers/restaurant-a1b2c3d4",
  owner: "cnbiz-customers",
  htmlUrl: "https://github.com/cnbiz-customers/restaurant-a1b2c3d4",
  cloneUrl: "https://github.com/cnbiz-customers/restaurant-a1b2c3d4.git",
  defaultBranch: "main",
};

const FAKE_PROJECT: VercelProject = { id: "prj_123", name: "restaurant-a1b2c3d4" };
const FAKE_DEPLOYMENT: VercelDeployment = {
  id: "dpl_123",
  url: "https://restaurant-a1b2c3d4.vercel.app",
  readyState: "READY",
};

/** 매 테스트가 호출 순서를 기록할 수 있도록 하는 공유 로그 배열. */
function buildSuccessfulDeps(callLog: string[]): DeploymentPipelineDeps {
  return {
    isGitHubConfigured: () => true,
    isVercelConfigured: () => true,
    createRepository: async () => {
      callLog.push("github.create_repo");
      return FAKE_REPO;
    },
    deleteRepository: async () => {
      callLog.push("rollback.github_repo");
      return { success: true };
    },
    ensureRepoInitialized: async () => {
      callLog.push("git.init");
      return { success: true };
    },
    commitAll: async () => {
      callLog.push("git.commit");
      return { success: true };
    },
    pushToRemote: async () => {
      callLog.push("git.push");
      return { success: true };
    },
    createProject: async () => {
      callLog.push("vercel.create_project");
      return FAKE_PROJECT;
    },
    linkGitRepository: async () => {
      callLog.push("vercel.link_repo");
      return { success: true };
    },
    createDeployment: async () => {
      callLog.push("vercel.deploy");
      return FAKE_DEPLOYMENT;
    },
    deleteProject: async () => {
      callLog.push("rollback.vercel_project");
      return { success: true };
    },
  };
}

describe("Deployment pipeline — lib/deployment/pipeline.ts (AI Business OS Rewiring Phase 3)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "deployment-pipeline-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("returns NotConfigured and records it on the Website record without calling any client function", async () => {
    const website = await createWebsiteRecord(
      { name: "Test", siteType: "restaurant", outDir: "/tmp/x", status: "Success", simulatedContent: false },
      store
    );

    let anyCalled = false;
    const deps: DeploymentPipelineDeps = {
      isGitHubConfigured: () => false,
      isVercelConfigured: () => true,
      createRepository: async () => {
        anyCalled = true;
        throw new Error("should not be called");
      },
      deleteRepository: async () => ({ success: true }),
      ensureRepoInitialized: async () => ({ success: true }),
      commitAll: async () => ({ success: true }),
      pushToRemote: async () => ({ success: true }),
      createProject: async () => ({ id: "x", name: "x" }),
      linkGitRepository: async () => ({ success: true }),
      createDeployment: async () => ({ id: "x", url: "x", readyState: "x" }),
      deleteProject: async () => ({ success: true }),
    };

    const result = await runDeploymentPipeline(
      { websiteId: website.id, outDir: website.outDir, repoBaseName: "restaurant" },
      deps,
      store
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe("NotConfigured");
    expect(result.rolledBack).toBe(false);
    expect(anyCalled).toBe(false);

    const persisted = await getWebsite(website.id, store);
    expect(persisted?.deploymentStatus).toBe("NotConfigured");
    expect(persisted?.repository).toBeUndefined();
  });

  it("runs all 5 external steps in order and persists repository/deployment info on success", async () => {
    const website = await createWebsiteRecord(
      { name: "Test", siteType: "restaurant", outDir: "/tmp/x", status: "Success", simulatedContent: false },
      store
    );

    const callLog: string[] = [];
    const deps = buildSuccessfulDeps(callLog);

    const result = await runDeploymentPipeline(
      { websiteId: website.id, outDir: website.outDir, repoBaseName: "restaurant" },
      deps,
      store
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe("Success");
    expect(result.repository).toEqual(FAKE_REPO);
    expect(result.deployment).toEqual(FAKE_DEPLOYMENT);
    expect(result.rolledBack).toBe(false);
    expect(callLog).toEqual([
      "github.create_repo",
      "git.init",
      "git.commit",
      "git.push",
      "vercel.create_project",
      "vercel.link_repo",
      "vercel.deploy",
    ]);

    const persisted = await getWebsite(website.id, store);
    expect(persisted?.deploymentStatus).toBe("Success");
    expect(persisted?.repository?.fullName).toBe(FAKE_REPO.fullName);
    expect(persisted?.deployment?.url).toBe(FAKE_DEPLOYMENT.url);
  });

  it("generates a repo name slugified from repoBaseName with the websiteId suffix", async () => {
    const website = await createWebsiteRecord(
      { name: "Test", siteType: "restaurant", outDir: "/tmp/x", status: "Success", simulatedContent: false },
      store
    );

    let nameSeenByGitHub = "";
    let nameSeenByVercel = "";
    const deps = buildSuccessfulDeps([]);
    deps.createRepository = async (input) => {
      nameSeenByGitHub = input.name;
      return FAKE_REPO;
    };
    deps.createProject = async (name) => {
      nameSeenByVercel = name;
      return FAKE_PROJECT;
    };

    await runDeploymentPipeline(
      { websiteId: website.id, outDir: website.outDir, repoBaseName: "한글 레스토랑" },
      deps,
      store
    );

    const expectedSuffix = website.id.slice(-8);
    expect(nameSeenByGitHub).toBe(`site-${expectedSuffix}`); // 한글만 있으면 "site"로 폴백
    expect(nameSeenByGitHub).toBe(nameSeenByVercel);
  });

  it("rolls back the GitHub repo when git push fails (Vercel project never created)", async () => {
    const website = await createWebsiteRecord(
      { name: "Test", siteType: "restaurant", outDir: "/tmp/x", status: "Success", simulatedContent: false },
      store
    );

    const callLog: string[] = [];
    const deps = buildSuccessfulDeps(callLog);
    deps.pushToRemote = async () => {
      callLog.push("git.push");
      return { success: false, error: "authentication failed" };
    };

    const result = await runDeploymentPipeline(
      { websiteId: website.id, outDir: website.outDir, repoBaseName: "restaurant" },
      deps,
      store
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe("Failed");
    expect(result.rolledBack).toBe(true);
    expect(result.error).toContain("git push 실패");
    expect(callLog).toEqual(["github.create_repo", "git.init", "git.commit", "git.push", "rollback.github_repo"]);
    // Vercel project was never created, so no Vercel rollback call should happen.
    expect(callLog).not.toContain("rollback.vercel_project");

    const persisted = await getWebsite(website.id, store);
    expect(persisted?.deploymentStatus).toBe("Failed");
    expect(persisted?.deploymentError).toContain("git push 실패");
  });

  it("rolls back both the Vercel project and the GitHub repo when the production deploy fails", async () => {
    const website = await createWebsiteRecord(
      { name: "Test", siteType: "restaurant", outDir: "/tmp/x", status: "Success", simulatedContent: false },
      store
    );

    const callLog: string[] = [];
    const deps = buildSuccessfulDeps(callLog);
    deps.createDeployment = async () => {
      callLog.push("vercel.deploy");
      throw new Error("build failed on Vercel");
    };

    const result = await runDeploymentPipeline(
      { websiteId: website.id, outDir: website.outDir, repoBaseName: "restaurant" },
      deps,
      store
    );

    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.error).toBe("build failed on Vercel");
    expect(callLog).toEqual([
      "github.create_repo",
      "git.init",
      "git.commit",
      "git.push",
      "vercel.create_project",
      "vercel.link_repo",
      "vercel.deploy",
      "rollback.vercel_project",
      "rollback.github_repo",
    ]);
  });

  it("reports rolledBack:false when a rollback step itself fails", async () => {
    const website = await createWebsiteRecord(
      { name: "Test", siteType: "restaurant", outDir: "/tmp/x", status: "Success", simulatedContent: false },
      store
    );

    const callLog: string[] = [];
    const deps = buildSuccessfulDeps(callLog);
    deps.createDeployment = async () => {
      throw new Error("build failed");
    };
    deps.deleteProject = async () => ({ success: false, error: "Vercel API unreachable" });

    const result = await runDeploymentPipeline(
      { websiteId: website.id, outDir: website.outDir, repoBaseName: "restaurant" },
      deps,
      store
    );

    expect(result.rolledBack).toBe(false);
  });
});
