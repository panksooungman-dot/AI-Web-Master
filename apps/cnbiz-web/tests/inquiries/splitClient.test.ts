import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { splitInquiryFromClient } from "../../lib/inquiries/splitClient";
import {
  createInquiry,
  getInquiry,
  linkInquiryToClientAndOrder,
} from "../../lib/inquiries/registry";
import { addInquiryToClient, addWebsiteOrderToClient, createClient, getClient } from "../../lib/clients/registry";
import { createWebsiteOrder, getWebsiteOrder } from "../../lib/websiteOrders/registry";
import type { InquiryInput } from "../../lib/inquiries/types";

const RESTAURANT_INQUIRY: InquiryInput = {
  source: "manual",
  companyName: "사색찬미한정식",
  contactName: "박담당",
  email: "shared@example.com",
  phone: "010-2222-2222",
  siteType: "restaurant",
  requirements: "예약 기능이 있는 한정식집 홈페이지",
};

describe("splitInquiryFromClient() — lib/inquiries/splitClient.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "split-client-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("의뢰가 없으면 실패한다", async () => {
    const result = await splitInquiryFromClient("nonexistent", store);
    expect(result).toEqual({ success: false, error: "의뢰를 찾을 수 없습니다." });
  });

  it("연결된 고객사가 없으면(clientId가 null) 이 의뢰 정보로 새 고객사를 만들어 연결한다", async () => {
    const inquiry = await createInquiry(RESTAURANT_INQUIRY, store);
    const result = await splitInquiryFromClient(inquiry.id, store);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.changed).toBe(true);
    expect(result.client.companyName).toBe("사색찬미한정식");

    const updatedInquiry = await getInquiry(inquiry.id, store);
    expect(updatedInquiry?.clientId).toBe(result.client.id);
  });

  it("clientId는 있는데 그 고객사 레코드가 사라졌으면(경합으로 Client가 삭제된 경우) 새로 만들어 연결한다", async () => {
    // 실사용 재현(2026-09-13): WebsiteOrder·AiJob·Project Workspace는 정상 생성됐는데
    // Client만 동시 쓰기 경합으로 사라진 상태 — clientId는 남아있지만 getClient()가 undefined.
    const inquiry = await createInquiry(RESTAURANT_INQUIRY, store);
    const order = await createWebsiteOrder(
      {
        clientId: "client-does-not-exist",
        inquiryId: inquiry.id,
        name: "사색찬미한정식 홈페이지 제작",
        siteType: "restaurant",
        requirements: RESTAURANT_INQUIRY.requirements,
      },
      store
    );
    await linkInquiryToClientAndOrder(inquiry.id, "client-does-not-exist", order.id, store);

    const result = await splitInquiryFromClient(inquiry.id, store);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.changed).toBe(true);
    expect(result.client.companyName).toBe("사색찬미한정식");
    expect(result.client.id).not.toBe("client-does-not-exist");

    const updatedInquiry = await getInquiry(inquiry.id, store);
    expect(updatedInquiry?.clientId).toBe(result.client.id);
    const updatedOrder = await getWebsiteOrder(order.id, store);
    expect(updatedOrder?.clientId).toBe(result.client.id);
  });

  it("다른 회사 문의와 잘못 합쳐진 의뢰를 별도 고객사로 분리한다(실사용 재현: cnbiz ↔ 사색찬미한정식)", async () => {
    // findOrCreateClient()가 이메일만 보던 시절의 상태를 그대로 재현 — 두 회사 문의가 하나의
    // Client("cnbiz")에 합쳐져 있다.
    const cnbizClient = await createClient(
      { companyName: "cnbiz", contactName: "박담당", email: "shared@example.com", phone: "010-1111-1111" },
      store
    );
    const restaurantInquiry = await createInquiry(RESTAURANT_INQUIRY, store);
    const order = await createWebsiteOrder(
      {
        clientId: cnbizClient.id,
        inquiryId: restaurantInquiry.id,
        name: "사색찬미한정식 홈페이지 제작",
        siteType: "restaurant",
        requirements: RESTAURANT_INQUIRY.requirements,
      },
      store
    );
    await linkInquiryToClientAndOrder(restaurantInquiry.id, cnbizClient.id, order.id, store);
    await addInquiryToClient(cnbizClient.id, restaurantInquiry.id, store);
    await addWebsiteOrderToClient(cnbizClient.id, order.id, store);

    const result = await splitInquiryFromClient(restaurantInquiry.id, store);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.changed).toBe(true);
    expect(result.client.id).not.toBe(cnbizClient.id);
    expect(result.client.companyName).toBe("사색찬미한정식");
    expect(result.client.phone).toBe("010-2222-2222");

    // 의뢰 자신의 clientId가 새 고객사로 바뀌었는지 확인.
    const updatedInquiry = await getInquiry(restaurantInquiry.id, store);
    expect(updatedInquiry?.clientId).toBe(result.client.id);

    // 연결된 WebsiteOrder도 함께 옮겨졌는지 확인 — "문자로 공유"가 새 고객사의 전화번호를 쓰게 됨.
    const updatedOrder = await getWebsiteOrder(order.id, store);
    expect(updatedOrder?.clientId).toBe(result.client.id);

    // 옛 Client("cnbiz")의 역참조 배열에서도 정리됐는지 확인 — 새 Client에는 반영됐는지 확인.
    const oldClientAfter = await getClient(cnbizClient.id, store);
    expect(oldClientAfter?.inquiryIds).not.toContain(restaurantInquiry.id);
    expect(oldClientAfter?.websiteOrderIds).not.toContain(order.id);
    expect(result.client.inquiryIds).toContain(restaurantInquiry.id);
    expect(result.client.websiteOrderIds).toContain(order.id);
  });

  it("같은 회사의 다른 의뢰를 여러 번 분리해도 새 Client 하나로 모인다(중복 생성 방지)", async () => {
    const cnbizClient = await createClient(
      { companyName: "cnbiz", contactName: "박담당", email: "shared@example.com", phone: "010-1111-1111" },
      store
    );

    const inquiryA = await createInquiry(RESTAURANT_INQUIRY, store);
    await linkInquiryToClientAndOrder(inquiryA.id, cnbizClient.id, "order-a", store);
    await addInquiryToClient(cnbizClient.id, inquiryA.id, store);

    const inquiryB = await createInquiry(RESTAURANT_INQUIRY, store);
    await linkInquiryToClientAndOrder(inquiryB.id, cnbizClient.id, "order-b", store);
    await addInquiryToClient(cnbizClient.id, inquiryB.id, store);

    const resultA = await splitInquiryFromClient(inquiryA.id, store);
    const resultB = await splitInquiryFromClient(inquiryB.id, store);

    expect(resultA.success && resultB.success).toBe(true);
    if (!resultA.success || !resultB.success) return;
    expect(resultB.client.id).toBe(resultA.client.id);
  });

  it("이미 자기 자신의 정보와 일치하는 Client에 연결되어 있으면 아무것도 바꾸지 않는다", async () => {
    const client = await createClient(
      {
        companyName: "사색찬미한정식",
        contactName: "박담당",
        email: "shared@example.com",
        phone: "010-2222-2222",
      },
      store
    );
    const inquiry = await createInquiry(RESTAURANT_INQUIRY, store);
    await linkInquiryToClientAndOrder(inquiry.id, client.id, "order-x", store);
    await addInquiryToClient(client.id, inquiry.id, store);

    const result = await splitInquiryFromClient(inquiry.id, store);

    expect(result).toEqual({ success: true, changed: false, client: expect.objectContaining({ id: client.id }) });
  });

  it("연결된 WebsiteOrder가 없는(아직 전환 전) 의뢰도 정상적으로 분리한다", async () => {
    const cnbizClient = await createClient(
      { companyName: "cnbiz", contactName: "박담당", email: "shared@example.com", phone: "010-1111-1111" },
      store
    );
    const inquiry = await createInquiry(RESTAURANT_INQUIRY, store);
    // websiteOrderId 없이 clientId만 채워진 상태(비정상이지만 방어적으로 처리되어야 함).
    await linkInquiryToClientAndOrder(inquiry.id, cnbizClient.id, "", store);
    await addInquiryToClient(cnbizClient.id, inquiry.id, store);

    const result = await splitInquiryFromClient(inquiry.id, store);
    expect(result.success).toBe(true);
  });
});
