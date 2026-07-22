import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createRequest, getRequest, listRequests, updateRequestStatus } from "../../lib/requests/registry";
import type { ProjectRequestInput } from "../../lib/requests/types";

const INPUT: ProjectRequestInput = {
  companyName: "Acme",
  contactName: "Jane",
  email: "jane@example.com",
  phone: "010-1234-5678",
  industry: "IT/소프트웨어",
  siteType: "기업 소개 사이트",
  features: ["온라인 문의/상담"],
  referenceSites: "https://example.com",
  budget: "500만원~1,000만원",
  message: "모던한 느낌의 홈페이지를 원합니다.",
};

describe("Request Registry — lib/requests/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "requests-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listRequests() returns an empty array before anything is created", async () => {
    expect(await listRequests(store)).toEqual([]);
  });

  it("createRequest() defaults status to 'New', assigns id/timestamps, and persists", async () => {
    const record = await createRequest(INPUT, store);

    expect(record.id).toBeTruthy();
    expect(record.status).toBe("New");
    expect(record.createdAt).toBeTruthy();
    expect(record.updatedAt).toBe(record.createdAt);
    expect(record.companyName).toBe("Acme");

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "project-requests.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
  });

  it("getRequest() finds a record by id, undefined for unknown id", async () => {
    const created = await createRequest(INPUT, store);

    expect((await getRequest(created.id, store))?.companyName).toBe("Acme");
    expect(await getRequest("does-not-exist", store)).toBeUndefined();
  });

  it("listRequests() returns entries newest first", async () => {
    await createRequest({ ...INPUT, companyName: "First" }, store);
    await createRequest({ ...INPUT, companyName: "Second" }, store);

    const records = await listRequests(store);
    expect(records.map((r) => r.companyName)).toEqual(["Second", "First"]);
  });

  it("updateRequestStatus() changes status and bumps updatedAt, leaving other records untouched", async () => {
    const created = await createRequest(INPUT, store);
    const other = await createRequest({ ...INPUT, companyName: "Other" }, store);

    const updated = await updateRequestStatus(created.id, "InReview", store);

    expect(updated?.status).toBe("InReview");
    // `!==` would flake when both timestamps land in the same millisecond (Date.now()
    // resolution) — `>=` still proves updatedAt was recomputed on top of createdAt.
    expect(updated?.updatedAt >= created.createdAt).toBe(true);
    expect((await getRequest(other.id, store))?.status).toBe("New");
  });

  it("updateRequestStatus() returns undefined for an unknown id", async () => {
    expect(await updateRequestStatus("does-not-exist", "Accepted", store)).toBeUndefined();
  });
});
