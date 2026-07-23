import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createAiJob } from "../../lib/aiJobs/registry";
import { triggerDeployment } from "../../lib/aiJobs/worker";
import { createWebsiteOrder, addWebsiteToOrder } from "../../lib/websiteOrders/registry";
import { createWebsiteRecord } from "../../lib/websites/registry";
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
