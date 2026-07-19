import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  addAiJobToWebsiteOrder,
  addWebsiteToOrder,
  createWebsiteOrder,
  listWebsiteOrdersByClient,
  updateWebsiteOrderStatus,
} from "../../lib/websiteOrders/registry";
import type { WebsiteOrderInput } from "../../lib/websiteOrders/types";

const INPUT: WebsiteOrderInput = {
  clientId: "client-1",
  inquiryId: "inquiry-1",
  name: "Acme 홈페이지 제작",
  siteType: "기업 소개 사이트",
  requirements: "모던한 느낌의 홈페이지를 원합니다.",
};

describe("Website Order Registry — lib/websiteOrders/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "website-orders-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createWebsiteOrder() defaults status to 'Requested' with no ai jobs or websites yet", async () => {
    const record = await createWebsiteOrder(INPUT, store);
    expect(record.status).toBe("Requested");
    expect(record.aiJobIds).toEqual([]);
    expect(record.websiteIds).toEqual([]);
  });

  it("listWebsiteOrdersByClient() filters by clientId only", async () => {
    const own = await createWebsiteOrder(INPUT, store);
    await createWebsiteOrder({ ...INPUT, clientId: "client-2" }, store);

    const results = await listWebsiteOrdersByClient("client-1", store);
    expect(results.map((r) => r.id)).toEqual([own.id]);
  });

  it("updateWebsiteOrderStatus() updates status", async () => {
    const created = await createWebsiteOrder(INPUT, store);
    const updated = await updateWebsiteOrderStatus(created.id, "InProgress", store);
    expect(updated?.status).toBe("InProgress");
  });

  it("addAiJobToWebsiteOrder() appends job ids without duplicating", async () => {
    const created = await createWebsiteOrder(INPUT, store);
    await addAiJobToWebsiteOrder(created.id, "ai-job-1", store);
    const again = await addAiJobToWebsiteOrder(created.id, "ai-job-1", store);
    expect(again?.aiJobIds).toEqual(["ai-job-1"]);
  });

  it("addWebsiteToOrder() appends website ids without duplicating", async () => {
    const created = await createWebsiteOrder(INPUT, store);
    await addWebsiteToOrder(created.id, "website-1", store);
    const again = await addWebsiteToOrder(created.id, "website-1", store);
    expect(again?.websiteIds).toEqual(["website-1"]);
  });
});
