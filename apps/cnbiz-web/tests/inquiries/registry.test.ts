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

  // lib/clients/registry.ts의 createClient() 동시 쓰기 경합 수정(2026-09-13, 커밋 #83)과 동일한
  // 원인이 createInquiry()에도 있었다(둘 다 list()+push()+replaceAll()). 실사용 재현(2026-09-14,
  // 챗봇에서 거의 동시에 여러 문의가 들어온 것으로 추정)으로 setDoc() 기반으로 함께 수정했다.
  describe("동시 쓰기 경합 — 서로 다른 서버리스 인스턴스를 흉내낸 재현(2026-09-14)", () => {
    it("setDoc() 기반 createInquiry()는 동시에 생성된 다른 Inquiry를 지우지 않는다", async () => {
      const storeA = createFsStore(baseDir);
      const storeB = createFsStore(baseDir);

      await Promise.all([
        createInquiry({ ...INPUT, companyName: "cnbiz" }, storeA),
        createInquiry({ ...INPUT, companyName: "사색찬미한정식" }, storeB),
      ]);

      const all = await listInquiries(store);
      expect(all.map((r) => r.companyName).sort()).toEqual(["cnbiz", "사색찬미한정식"]);
    });

    it("(대조군) 옛 list()+replaceAll() 방식이었다면 이 경합에서 실제로 유실됐음을 확인", async () => {
      const storeA = createFsStore(baseDir);
      const storeB = createFsStore(baseDir);

      async function legacyCreateInquiry(input: InquiryInput, s: ReturnType<typeof createFsStore>) {
        const records = await s.list<{ id: string } & InquiryInput>("inquiries");
        await new Promise((resolve) => setTimeout(resolve, 10));
        records.push({ id: `inquiry-${input.companyName}`, ...input });
        await s.replaceAll("inquiries", records);
      }

      await Promise.all([
        legacyCreateInquiry({ ...INPUT, companyName: "cnbiz" }, storeA),
        legacyCreateInquiry({ ...INPUT, companyName: "사색찬미한정식" }, storeB),
      ]);

      const all = await store.list<{ companyName: string }>("inquiries");
      expect(all.length).toBeLessThan(2);
    });
  });
});
