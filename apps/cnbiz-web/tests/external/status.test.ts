import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createInquiry } from "../../lib/inquiries/registry";
import { createWebsiteOrder, addAiJobToWebsiteOrder, addWebsiteToOrder } from "../../lib/websiteOrders/registry";
import { createAiJob, updateAiJobStatus } from "../../lib/aiJobs/registry";
import { createWebsiteRecord } from "../../lib/websites/registry";
import { getExternalInquiryStatus } from "../../lib/external/status";
import type { InquiryInput } from "../../lib/inquiries/types";

const INQUIRY_INPUT: InquiryInput = {
  source: "chatbot",
  companyName: "테스트상사",
  contactName: "김테스트",
  email: "test@example.com",
  phone: "010-0000-0000",
  siteType: "restaurant",
  requirements: "외부 상태 조회 API 테스트",
};

describe("External inquiry status — lib/external/status.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "external-status-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("returns null for an unknown inquiryId", async () => {
    expect(await getExternalInquiryStatus("does-not-exist", store)).toBeNull();
  });

  it("Received: an inquiry with no linked order yet", async () => {
    const inquiry = await createInquiry(INQUIRY_INPUT, store);

    const result = await getExternalInquiryStatus(inquiry.id, store);

    expect(result?.status).toBe("Received");
    expect(result?.stages.received.done).toBe(true);
    expect(result?.stages.orderCreated.done).toBe(false);
    expect(result?.order).toBeNull();
    expect(result?.website).toBeNull();
    expect(result?.error).toBeNull();
  });

  it("JobCreated: order + job exist but job is still Queued", async () => {
    const inquiry = await createInquiry(INQUIRY_INPUT, store);
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: inquiry.id, name: "테스트 홈페이지", siteType: "restaurant", requirements: "x" },
      store
    );
    // linkInquiryToClientAndOrder isn't called here on purpose — status.ts reads
    // inquiry.websiteOrderId, so we set it directly the same way that function would.
    await store.replaceAll("inquiries", [{ ...inquiry, websiteOrderId: order.id }]);

    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);
    await addAiJobToWebsiteOrder(order.id, job.id, store);

    const result = await getExternalInquiryStatus(inquiry.id, store);

    expect(result?.status).toBe("JobCreated");
    expect(result?.stages.orderCreated.done).toBe(true);
    expect(result?.stages.jobCreated.done).toBe(true);
    expect(result?.stages.running.done).toBe(false);
    expect(result?.order).toEqual({ id: order.id, name: "테스트 홈페이지", siteType: "restaurant", status: "Requested" });
  });

  it("Running: job has started but not finished", async () => {
    const inquiry = await createInquiry(INQUIRY_INPUT, store);
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: inquiry.id, name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    await store.replaceAll("inquiries", [{ ...inquiry, websiteOrderId: order.id }]);

    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);
    await addAiJobToWebsiteOrder(order.id, job.id, store);
    await updateAiJobStatus(job.id, "Running", {}, store);

    const result = await getExternalInquiryStatus(inquiry.id, store);

    expect(result?.status).toBe("Running");
    expect(result?.stages.running.done).toBe(true);
    expect(result?.stages.completed.done).toBe(false);
  });

  it("Completed: job Success with a generated website attached", async () => {
    const inquiry = await createInquiry(INQUIRY_INPUT, store);
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: inquiry.id, name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    await store.replaceAll("inquiries", [{ ...inquiry, websiteOrderId: order.id }]);

    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);
    await addAiJobToWebsiteOrder(order.id, job.id, store);
    await updateAiJobStatus(job.id, "Running", {}, store);

    const website = await createWebsiteRecord(
      { name: "테스트", siteType: "restaurant", outDir: "/tmp/x", status: "Success", simulatedContent: false },
      store
    );
    await addWebsiteToOrder(order.id, website.id, store);
    await updateAiJobStatus(job.id, "Success", {}, store);

    const result = await getExternalInquiryStatus(inquiry.id, store);

    expect(result?.status).toBe("Completed");
    expect(result?.stages.websiteGenerated.done).toBe(true);
    expect(result?.stages.completed.done).toBe(true);
    expect(result?.completedAt).toBeTruthy();
    expect(result?.website).toEqual({
      id: website.id,
      name: "테스트",
      siteType: "restaurant",
      previewUrl: null,
      deployUrl: null,
    });
    // No live deploy pipeline exists yet — the field must stay present but unset.
    expect(result?.stages.deployed).toEqual({ done: false, at: null });
    expect(result?.error).toBeNull();
  });

  it("Failed: job Failed carries the worker's error message", async () => {
    const inquiry = await createInquiry(INQUIRY_INPUT, store);
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: inquiry.id, name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    await store.replaceAll("inquiries", [{ ...inquiry, websiteOrderId: order.id }]);

    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);
    await addAiJobToWebsiteOrder(order.id, job.id, store);
    await updateAiJobStatus(job.id, "Failed", { error: "packages/cli가 아직 빌드되지 않았습니다." }, store);

    const result = await getExternalInquiryStatus(inquiry.id, store);

    expect(result?.status).toBe("Failed");
    expect(result?.error).toBe("packages/cli가 아직 빌드되지 않았습니다.");
    expect(result?.stages.failed.done).toBe(true);
  });

  it("Failed: a manually Cancelled job maps to Failed with a fallback message", async () => {
    const inquiry = await createInquiry(INQUIRY_INPUT, store);
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: inquiry.id, name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    await store.replaceAll("inquiries", [{ ...inquiry, websiteOrderId: order.id }]);

    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);
    await addAiJobToWebsiteOrder(order.id, job.id, store);
    await updateAiJobStatus(job.id, "Cancelled", {}, store);

    const result = await getExternalInquiryStatus(inquiry.id, store);

    expect(result?.status).toBe("Failed");
    expect(result?.error).toBe("제작이 취소되었습니다.");
  });

  it("uses the most recent AiJob when a WebsiteOrder has more than one (retry scenario)", async () => {
    const inquiry = await createInquiry(INQUIRY_INPUT, store);
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: inquiry.id, name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    await store.replaceAll("inquiries", [{ ...inquiry, websiteOrderId: order.id }]);

    const firstJob = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);
    await addAiJobToWebsiteOrder(order.id, firstJob.id, store);
    await updateAiJobStatus(firstJob.id, "Failed", { error: "첫 시도 실패" }, store);

    const retryJob = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);
    await addAiJobToWebsiteOrder(order.id, retryJob.id, store);
    await updateAiJobStatus(retryJob.id, "Running", {}, store);

    const result = await getExternalInquiryStatus(inquiry.id, store);

    expect(result?.status).toBe("Running");
    expect(result?.error).toBeNull();
  });
});
