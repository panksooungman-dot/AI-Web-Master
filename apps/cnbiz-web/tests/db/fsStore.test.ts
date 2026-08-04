import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createWebsiteOrder, updateWebsiteOrderStatus, addAiJobToWebsiteOrder, listWebsiteOrders, getWebsiteOrder } from "../../lib/websiteOrders/registry";
import { incrementMetric, readMetrics } from "../../lib/metrics/registry";

/**
 * Release Readiness Audit — Major #3. Every registry mutation follows the same shape:
 * list()/getDoc() (read the whole file) → mutate in JS → replaceAll()/setDoc() (write the whole
 * file back) — two calls with nothing in the CollectionStore interface linking them. Without a
 * lock, firing many of these concurrently (Promise.all — exactly what happens under real
 * concurrent HTTP requests) makes every caller read the same pre-mutation snapshot and the last
 * writer wins, silently discarding everyone else's change. These tests exercise real registries
 * (lib/websiteOrders/registry.ts, lib/metrics/registry.ts) — not just the raw store — so the fix
 * is proven at the same layer the audit flagged (createAiJob/addAiJobToWebsiteOrder etc. all sit
 * on top of exactly this store).
 */
describe("fsStore concurrency — CollectionStore lost-update fix (Release Readiness Audit Major #3)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "fsstore-concurrency-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("baseline: list()/replaceAll()/getDoc()/setDoc() still behave correctly for plain sequential use", async () => {
    await store.replaceAll("things", [{ id: "a", value: 1 }]);
    expect(await store.list("things")).toEqual([{ id: "a", value: 1 }]);

    await store.setDoc("counters", "c1", { n: 1 });
    expect(await store.getDoc("counters", "c1")).toEqual({ n: 1 });
  });

  it("100 concurrent create() calls on the same Registry lose 0 records (lib/websiteOrders/registry.ts)", async () => {
    const inputs = Array.from({ length: 100 }, (_, i) => ({
      clientId: "client-1",
      inquiryId: "inquiry-1",
      name: `동시성 테스트 주문 ${i}`,
      siteType: "corporate",
      requirements: "concurrency test",
    }));

    const created = await Promise.all(inputs.map((input) => createWebsiteOrder(input, store)));

    const ids = new Set(created.map((r) => r.id));
    expect(ids.size).toBe(100); // no id collisions

    const all = await listWebsiteOrders(store);
    expect(all.length).toBe(100); // every create actually persisted — none overwritten by another
    for (const id of ids) {
      expect(all.some((r) => r.id === id)).toBe(true);
    }
  });

  it("100 concurrent update() calls on 100 different existing records lose 0 updates", async () => {
    // Setup — 100 pre-existing records, created sequentially (setup phase, not under test).
    const orders = [];
    for (let i = 0; i < 100; i++) {
      orders.push(
        await createWebsiteOrder(
          { clientId: "client-1", inquiryId: "inquiry-1", name: `주문 ${i}`, siteType: "corporate", requirements: "x" },
          store
        )
      );
    }
    expect(orders.every((o) => o.status === "Requested")).toBe(true);

    // 100 concurrent updates, each to a DIFFERENT record.
    await Promise.all(orders.map((o) => updateWebsiteOrderStatus(o.id, "InProgress", store)));

    const all = await listWebsiteOrders(store);
    expect(all.length).toBe(100); // no record disappeared
    for (const order of orders) {
      const updated = all.find((r) => r.id === order.id);
      expect(updated?.status).toBe("InProgress"); // every update actually landed
    }
  });

  it("100 concurrent append() calls onto the SAME record's array field lose 0 appends (addAiJobToWebsiteOrder)", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "동시 append 테스트", siteType: "corporate", requirements: "x" },
      store
    );
    expect(order.aiJobIds).toEqual([]);

    const jobIds = Array.from({ length: 100 }, (_, i) => `ai-job-concurrency-${i}`);

    // All 100 callers read the SAME starting aiJobIds:[] and each append exactly one id — the
    // exact shape of the lost-update bug the audit found (createAiJob() → addAiJobToWebsiteOrder()).
    await Promise.all(jobIds.map((jobId) => addAiJobToWebsiteOrder(order.id, jobId, store)));

    const updated = await getWebsiteOrder(order.id, store);
    expect(updated?.aiJobIds.length).toBe(100); // none of the 100 appends were lost
    for (const jobId of jobIds) {
      expect(updated?.aiJobIds).toContain(jobId);
    }
    // No duplicates and no foreign values either — exactly the 100 we appended.
    expect(new Set(updated?.aiJobIds).size).toBe(100);
  });

  it("100 concurrent getDoc()/setDoc() increments on the same doc lose 0 increments (incrementMetric, the counter shape)", async () => {
    await Promise.all(Array.from({ length: 100 }, () => incrementMetric("buildCount", 1, store)));

    const metrics = await readMetrics(store);
    expect(metrics.buildCount).toBe(100); // none of the 100 +1s were lost to a stale read
  });

  it("locking is per-collection, not global — concurrent writes to two different collections don't serialize against each other incorrectly", async () => {
    await Promise.all([
      store.replaceAll("collection-a", [{ id: "a1" }]),
      store.replaceAll("collection-b", [{ id: "b1" }]),
    ]);

    expect(await store.list("collection-a")).toEqual([{ id: "a1" }]);
    expect(await store.list("collection-b")).toEqual([{ id: "b1" }]);
  });

  it("locking is per-baseDir (per createFsStore() instance) — isolated stores never contend with each other", async () => {
    const otherBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "fsstore-concurrency-test-other-"));
    const otherStore = createFsStore(otherBaseDir);

    try {
      // Same collection NAME in two independent stores — must not block each other or bleed data.
      await Promise.all([
        store.replaceAll("shared-name", [{ id: "from-store-1" }]),
        otherStore.replaceAll("shared-name", [{ id: "from-store-2" }]),
      ]);

      expect(await store.list("shared-name")).toEqual([{ id: "from-store-1" }]);
      expect(await otherStore.list("shared-name")).toEqual([{ id: "from-store-2" }]);
    } finally {
      fs.rmSync(otherBaseDir, { recursive: true, force: true });
    }
  });
});
