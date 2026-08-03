import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createAiJob } from "../../lib/aiJobs/registry";
import { triggerDeployment, triggerWorkspaceProvisioning } from "../../lib/aiJobs/worker";
import { createWebsiteOrder, addWebsiteToOrder, getWebsiteOrder, setWebsiteOrderProject } from "../../lib/websiteOrders/registry";
import { createWebsiteRecord } from "../../lib/websites/registry";
import { createClient } from "../../lib/clients/registry";
import { getProject, listProjects } from "../../lib/projects/registry";
import { getWorkspace, listWorkspaces } from "../../lib/workspaces/registry";
import type { DeploymentPipelineInput, DeploymentPipelineResult } from "../../lib/deployment/types";

const FAKE_SUCCESS_RESULT: DeploymentPipelineResult = {
  success: true,
  status: "Success",
  logs: [],
  repository: null,
  deployment: null,
  rolledBack: false,
};

describe("AI Job Worker — triggerDeployment() (AI Business OS Rewiring Phase 3)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-deployment-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("calls the deployment pipeline for the most recently attached website of a successful job", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "테스트 홈페이지", siteType: "restaurant", requirements: "x" },
      store
    );
    const website = await createWebsiteRecord(
      { name: "테스트", siteType: "restaurant", outDir: "/tmp/out", status: "Success", simulatedContent: false },
      store
    );
    await addWebsiteToOrder(order.id, website.id, store);
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    const calls: DeploymentPipelineInput[] = [];
    const fakeDeploy = async (input: DeploymentPipelineInput) => {
      calls.push(input);
      return FAKE_SUCCESS_RESULT;
    };

    await triggerDeployment(job.id, fakeDeploy, store);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ websiteId: website.id, outDir: "/tmp/out", repoBaseName: "restaurant" });
  });

  it("uses the last websiteId when a WebsiteOrder has more than one (retry scenario)", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    const firstAttempt = await createWebsiteRecord(
      { name: "첫시도", siteType: "restaurant", outDir: "/tmp/first", status: "Failed", simulatedContent: false, error: "실패" },
      store
    );
    await addWebsiteToOrder(order.id, firstAttempt.id, store);
    const retryAttempt = await createWebsiteRecord(
      { name: "재시도", siteType: "restaurant", outDir: "/tmp/retry", status: "Success", simulatedContent: false },
      store
    );
    await addWebsiteToOrder(order.id, retryAttempt.id, store);
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    const calls: DeploymentPipelineInput[] = [];
    await triggerDeployment(
      job.id,
      async (input) => {
        calls.push(input);
        return FAKE_SUCCESS_RESULT;
      },
      store
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].websiteId).toBe(retryAttempt.id);
  });

  it("does nothing when the most recent attached website Failed (never reached processJob's Success path in practice, but defensive)", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    const failed = await createWebsiteRecord(
      { name: "실패", siteType: "restaurant", outDir: "/tmp/x", status: "Failed", simulatedContent: false, error: "e" },
      store
    );
    await addWebsiteToOrder(order.id, failed.id, store);
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    let called = false;
    await triggerDeployment(
      job.id,
      async () => {
        called = true;
        return FAKE_SUCCESS_RESULT;
      },
      store
    );

    expect(called).toBe(false);
  });

  it("does nothing when the WebsiteOrder has no attached websites yet", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    let called = false;
    await triggerDeployment(
      job.id,
      async () => {
        called = true;
        return FAKE_SUCCESS_RESULT;
      },
      store
    );

    expect(called).toBe(false);
  });

  it("does nothing when the job does not exist", async () => {
    let called = false;
    await triggerDeployment(
      "does-not-exist",
      async () => {
        called = true;
        return FAKE_SUCCESS_RESULT;
      },
      store
    );

    expect(called).toBe(false);
  });
});

describe("AI Job Worker — triggerWorkspaceProvisioning() (의뢰 승인 → Project Workspace 자동 생성)", () => {
  let baseDir: string;
  let generatedSitesDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-workspace-test-"));
    generatedSitesDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-workspace-outdir-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
    fs.rmSync(generatedSitesDir, { recursive: true, force: true });
  });

  it("registers a Workspace + Project for the most recently attached website, and links it back onto the WebsiteOrder", async () => {
    const client = await createClient(
      { companyName: "테스트치과", contactName: "홍길동", email: "a@example.com", phone: "010-0000-0000" },
      store
    );
    const order = await createWebsiteOrder(
      { clientId: client.id, inquiryId: "inquiry-1", name: "테스트치과 홈페이지", siteType: "dental", requirements: "요구사항" },
      store
    );
    const outDir = path.join(generatedSitesDir, "job-1");
    const website = await createWebsiteRecord(
      { name: "테스트치과 홈페이지", siteType: "dental", outDir, status: "Success", simulatedContent: false },
      store
    );
    await addWebsiteToOrder(order.id, website.id, store);
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    await triggerWorkspaceProvisioning(job.id, store);

    const updatedOrder = await getWebsiteOrder(order.id, store);
    expect(updatedOrder?.projectId).toBeTruthy();

    const project = await getProject(updatedOrder!.projectId!, store);
    expect(project?.name).toBe("테스트치과 홈페이지");
    expect(project?.company).toBe("테스트치과");
    expect(project?.autoProvisioned).toBe(true);
    expect(project?.websiteOrderId).toBe(order.id);

    const workspace = await getWorkspace(project!.workspaceId, store);
    expect(workspace?.path).toBe(outDir);
    expect(fs.existsSync(outDir)).toBe(true);
  });

  it("does not create a duplicate Project when the WebsiteOrder already has one (retry scenario)", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    await setWebsiteOrderProject(order.id, "project-already-exists", store);

    const outDir = path.join(generatedSitesDir, "job-retry");
    const website = await createWebsiteRecord(
      { name: "테스트", siteType: "restaurant", outDir, status: "Success", simulatedContent: false },
      store
    );
    await addWebsiteToOrder(order.id, website.id, store);
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    await triggerWorkspaceProvisioning(job.id, store);

    expect(await listProjects(store)).toHaveLength(0);
    expect(await listWorkspaces(store)).toHaveLength(0);
    const updatedOrder = await getWebsiteOrder(order.id, store);
    expect(updatedOrder?.projectId).toBe("project-already-exists");
  });

  it("does nothing when the most recently attached website Failed", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    const failed = await createWebsiteRecord(
      { name: "실패", siteType: "restaurant", outDir: path.join(generatedSitesDir, "failed"), status: "Failed", simulatedContent: false, error: "e" },
      store
    );
    await addWebsiteToOrder(order.id, failed.id, store);
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    await triggerWorkspaceProvisioning(job.id, store);

    expect(await listProjects(store)).toHaveLength(0);
  });

  it("does nothing when the WebsiteOrder has no attached websites yet", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    await triggerWorkspaceProvisioning(job.id, store);

    expect(await listProjects(store)).toHaveLength(0);
  });

  it("does nothing when the job does not exist", async () => {
    await triggerWorkspaceProvisioning("does-not-exist", store);
    expect(await listProjects(store)).toHaveLength(0);
  });
});
