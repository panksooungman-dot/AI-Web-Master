import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  addAiJobToWebsiteOrder,
  addWebsiteToOrder,
  createWebsiteOrder,
  ensureWebsiteOrderShareToken,
  getWebsiteOrderByShareToken,
  listWebsiteOrders,
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

  it("ensureWebsiteOrderShareToken() generates a token once and reuses it on repeat calls, undefined for unknown id", async () => {
    const created = await createWebsiteOrder(INPUT, store);
    expect(created.shareToken).toBeUndefined();

    const first = await ensureWebsiteOrderShareToken(created.id, store);
    const second = await ensureWebsiteOrderShareToken(created.id, store);

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(await ensureWebsiteOrderShareToken("does-not-exist", store)).toBeUndefined();
  });

  it("getWebsiteOrderByShareToken() finds the order that owns the token, undefined when no order has it", async () => {
    const created = await createWebsiteOrder(INPUT, store);
    const token = await ensureWebsiteOrderShareToken(created.id, store);

    expect((await getWebsiteOrderByShareToken(token!, store))?.id).toBe(created.id);
    expect(await getWebsiteOrderByShareToken("does-not-exist", store)).toBeUndefined();
  });

  // lib/clients/registry.ts의 createClient() 동시 쓰기 경합 수정(2026-09-13, 커밋 #83)과 동일한
  // 원인이 createWebsiteOrder()에도 있었다(둘 다 list()+push()+replaceAll()). setDoc() 기반으로
  // 함께 수정했다(2026-09-14).
  describe("동시 쓰기 경합 — 서로 다른 서버리스 인스턴스를 흉내낸 재현(2026-09-14)", () => {
    it("setDoc() 기반 createWebsiteOrder()는 동시에 생성된 다른 주문을 지우지 않는다", async () => {
      const storeA = createFsStore(baseDir);
      const storeB = createFsStore(baseDir);

      await Promise.all([
        createWebsiteOrder({ ...INPUT, name: "A 홈페이지" }, storeA),
        createWebsiteOrder({ ...INPUT, name: "B 홈페이지" }, storeB),
      ]);

      const all = await listWebsiteOrders(store);
      expect(all.map((r) => r.name).sort()).toEqual(["A 홈페이지", "B 홈페이지"]);
    });

    it("(대조군) 옛 list()+replaceAll() 방식이었다면 이 경합에서 실제로 유실됐음을 확인", async () => {
      const storeA = createFsStore(baseDir);
      const storeB = createFsStore(baseDir);

      async function legacyCreateOrder(input: WebsiteOrderInput, s: ReturnType<typeof createFsStore>) {
        const records = await s.list<{ id: string } & WebsiteOrderInput>("website-orders");
        await new Promise((resolve) => setTimeout(resolve, 10));
        records.push({ id: `order-${input.name}`, ...input });
        await s.replaceAll("website-orders", records);
      }

      await Promise.all([
        legacyCreateOrder({ ...INPUT, name: "A 홈페이지" }, storeA),
        legacyCreateOrder({ ...INPUT, name: "B 홈페이지" }, storeB),
      ]);

      const all = await store.list<{ name: string }>("website-orders");
      expect(all.length).toBeLessThan(2);
    });
  });
});
