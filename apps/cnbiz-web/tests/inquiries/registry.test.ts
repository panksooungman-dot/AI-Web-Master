import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  createInquiry,
  getInquiry,
  linkInquiryToClientAndOrder,
  listInquiries,
  updateInquiryStatus,
} from "../../lib/inquiries/registry";
import type { InquiryInput } from "../../lib/inquiries/types";

const INPUT: InquiryInput = {
  source: "chatbot",
  externalConversationId: "conv-1",
  companyName: "Acme",
  contactName: "Jane",
  email: "jane@example.com",
  phone: "010-1234-5678",
  siteType: "기업 소개 사이트",
  requirements: "모던한 느낌의 홈페이지를 원합니다.",
};

describe("Inquiry Registry — lib/inquiries/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "inquiries-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createInquiry() defaults status to 'New' and clientId/websiteOrderId to null", async () => {
    const record = await createInquiry(INPUT, store);

    expect(record.status).toBe("New");
    expect(record.clientId).toBeNull();
    expect(record.websiteOrderId).toBeNull();
    expect(record.updatedAt).toBe(record.createdAt);
  });

  it("getInquiry()/listInquiries() find by id and sort newest first", async () => {
    const first = await createInquiry(INPUT, store);
    const second = await createInquiry({ ...INPUT, companyName: "Second" }, store);

    expect((await getInquiry(first.id, store))?.companyName).toBe("Acme");
    expect((await listInquiries(store)).map((r) => r.id)).toEqual([second.id, first.id]);
  });

  it("updateInquiryStatus() changes status without touching clientId/websiteOrderId", async () => {
    const created = await createInquiry(INPUT, store);
    const updated = await updateInquiryStatus(created.id, "Qualified", store);

    expect(updated?.status).toBe("Qualified");
    expect(updated?.clientId).toBeNull();
  });

  it("linkInquiryToClientAndOrder() sets clientId/websiteOrderId and moves status to Converted", async () => {
    const created = await createInquiry(INPUT, store);
    const linked = await linkInquiryToClientAndOrder(created.id, "client-1", "website-order-1", store);

    expect(linked?.status).toBe("Converted");
    expect(linked?.clientId).toBe("client-1");
    expect(linked?.websiteOrderId).toBe("website-order-1");
  });
});
