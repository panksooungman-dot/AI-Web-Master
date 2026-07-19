import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createAiJob, listAiJobsByWebsiteOrder, updateAiJobStatus } from "../../lib/aiJobs/registry";
import type { AiJobInput } from "../../lib/aiJobs/types";

const INPUT: AiJobInput = {
  websiteOrderId: "website-order-1",
  type: "generate_website",
  payload: { siteType: "기업 소개 사이트" },
};

describe("AI Job Registry — lib/aiJobs/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-jobs-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createAiJob() starts Queued with progress 0 and null timestamps", async () => {
    const record = await createAiJob(INPUT, store);
    expect(record.status).toBe("Queued");
    expect(record.progress).toBe(0);
    expect(record.startedAt).toBeNull();
    expect(record.finishedAt).toBeNull();
  });

  it("listAiJobsByWebsiteOrder() filters by websiteOrderId", async () => {
    const own = await createAiJob(INPUT, store);
    await createAiJob({ ...INPUT, websiteOrderId: "website-order-2" }, store);

    const results = await listAiJobsByWebsiteOrder("website-order-1", store);
    expect(results.map((r) => r.id)).toEqual([own.id]);
  });

  it("updateAiJobStatus() sets startedAt once on Running and finishedAt once on a terminal status", async () => {
    const created = await createAiJob(INPUT, store);

    const running = await updateAiJobStatus(created.id, "Running", { progress: 10 }, store);
    expect(running?.startedAt).toBeTruthy();
    expect(running?.finishedAt).toBeNull();

    const success = await updateAiJobStatus(
      created.id,
      "Success",
      { progress: 100, result: { url: "https://example.com" } },
      store
    );
    expect(success?.startedAt).toBe(running?.startedAt);
    expect(success?.finishedAt).toBeTruthy();
    expect(success?.result).toEqual({ url: "https://example.com" });
  });

  it("updateAiJobStatus() returns undefined for an unknown id", async () => {
    expect(await updateAiJobStatus("does-not-exist", "Failed", {}, store)).toBeUndefined();
  });
});
