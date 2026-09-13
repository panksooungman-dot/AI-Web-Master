import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  addInquiryToClient,
  addWebsiteOrderToClient,
  createClient,
  findClientByEmail,
  findClientsByEmail,
  findOrCreateClient,
  getClient,
  listClients,
  updateClient,
} from "../../lib/clients/registry";
import type { ClientInput } from "../../lib/clients/types";

const INPUT: ClientInput = {
  companyName: "Acme",
  contactName: "Jane",
  email: "Jane@Example.com",
  phone: "010-1234-5678",
};

describe("Client Registry — lib/clients/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "clients-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createClient() starts with empty inquiryIds/websiteOrderIds", async () => {
    const record = await createClient(INPUT, store);
    expect(record.inquiryIds).toEqual([]);
    expect(record.websiteOrderIds).toEqual([]);
  });

  it("findClientByEmail() matches case-insensitively", async () => {
    const created = await createClient(INPUT, store);
    expect((await findClientByEmail("jane@example.com", store))?.id).toBe(created.id);
    expect(await findClientByEmail("nobody@example.com", store)).toBeUndefined();
  });

  it("findClientsByEmail() returns every client sharing that email", async () => {
    const acme = await createClient(INPUT, store);
    const other = await createClient({ ...INPUT, companyName: "Other Co" }, store);

    const matches = await findClientsByEmail(INPUT.email, store);
    expect(matches.map((c) => c.id).sort()).toEqual([acme.id, other.id].sort());
  });

  it("findOrCreateClient() reuses an existing client when email AND company name match", async () => {
    const created = await createClient(INPUT, store);
    const found = await findOrCreateClient(INPUT, store);

    expect(found.id).toBe(created.id);
    expect((await getClient(created.id, store)) !== undefined).toBe(true);
  });

  it("findOrCreateClient() creates a new client when no match exists", async () => {
    const record = await findOrCreateClient(INPUT, store);
    expect(record.email).toBe(INPUT.email);
  });

  it("findOrCreateClient() creates a separate client for the same email with a different company name", async () => {
    // 실사용 재현: "cnbiz" 담당자가 같은 이메일로 "사색찬미한정식" 일을 문의하면 기존 cnbiz
    // 고객사에 합쳐지지 않고 별도 고객사가 새로 생겨야 한다.
    const cnbiz = await createClient({ ...INPUT, companyName: "cnbiz" }, store);
    const restaurant = await findOrCreateClient({ ...INPUT, companyName: "사색찬미한정식" }, store);

    expect(restaurant.id).not.toBe(cnbiz.id);
    expect(restaurant.companyName).toBe("사색찬미한정식");

    const all = await findClientsByEmail(INPUT.email, store);
    expect(all).toHaveLength(2);
  });

  it("findOrCreateClient() treats blank company names as the same client (no false split)", async () => {
    const first = await createClient({ ...INPUT, companyName: "" }, store);
    const second = await findOrCreateClient({ ...INPUT, companyName: "" }, store);

    expect(second.id).toBe(first.id);
  });

  it("findOrCreateClient() company-name match is case/whitespace insensitive", async () => {
    const created = await createClient({ ...INPUT, companyName: "Acme" }, store);
    const found = await findOrCreateClient({ ...INPUT, companyName: "  ACME  " }, store);

    expect(found.id).toBe(created.id);
  });

  it("addInquiryToClient()/addWebsiteOrderToClient() append ids without duplicating", async () => {
    const created = await createClient(INPUT, store);

    await addInquiryToClient(created.id, "inquiry-1", store);
    const afterDuplicate = await addInquiryToClient(created.id, "inquiry-1", store);
    expect(afterDuplicate?.inquiryIds).toEqual(["inquiry-1"]);

    const withOrder = await addWebsiteOrderToClient(created.id, "website-order-1", store);
    expect(withOrder?.websiteOrderIds).toEqual(["website-order-1"]);
  });

  it("updateClient() applies a partial patch and bumps updatedAt", async () => {
    const created = await createClient(INPUT, store);
    const originalUpdatedAt = created.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = await updateClient(created.id, { phone: "010-9999-8888" }, store);

    expect(updated?.phone).toBe("010-9999-8888");
    // 다른 필드는 그대로 유지되어야 한다 (부분 수정).
    expect(updated?.companyName).toBe(INPUT.companyName);
    expect(updated?.email).toBe(INPUT.email);
    expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("updateClient() returns undefined for an unknown id", async () => {
    expect(await updateClient("nonexistent", { phone: "010-0000-0000" }, store)).toBeUndefined();
  });

  it("listClients() sorts by company name (not registration order)", async () => {
    // 등록 순서와 이름 순서가 정반대가 되도록 만들어, createdAt 정렬이 남아있으면 실패하게 한다.
    await createClient({ ...INPUT, companyName: "Zebra Co", email: "z@example.com" }, store);
    await createClient({ ...INPUT, companyName: "Acme Co", email: "a@example.com" }, store);
    await createClient({ ...INPUT, companyName: "Mid Co", email: "m@example.com" }, store);

    const names = (await listClients(store)).map((c) => c.companyName);
    expect(names).toEqual(["Acme Co", "Mid Co", "Zebra Co"]);
  });

  it("listClients() falls back to contact name when company name is blank", async () => {
    await createClient({ ...INPUT, companyName: "", contactName: "Zed", email: "zed@example.com" }, store);
    await createClient({ ...INPUT, companyName: "", contactName: "Amy", email: "amy@example.com" }, store);

    const names = (await listClients(store)).map((c) => c.contactName);
    expect(names).toEqual(["Amy", "Zed"]);
  });

  describe("동시 쓰기 경합 — 서로 다른 서버리스 인스턴스를 흉내낸 재현(2026-09-13)", () => {
    // 실제 프로덕션 재현: "사색찬미한정식" Client가 WebsiteOrder·AiJob은 정상 생성됐는데
    // 사라진 채로 발견됨. lib/db/collectionLock.ts의 락은 프로세스 안에서만 순서를 보장하므로,
    // 같은 baseDir를 가리키되 서로 다른 createFsStore() 인스턴스(= 서로 다른 락 테이블, 서로
    // 다른 서버리스 인스턴스와 동등)로 시뮬레이션한다.
    it("setDoc() 기반 createClient()는 동시에 생성된 다른 Client를 지우지 않는다", async () => {
      const storeA = createFsStore(baseDir);
      const storeB = createFsStore(baseDir);

      // 두 "인스턴스"가 서로의 쓰기를 보지 못한 채 동시에 각자 새 Client를 만든다.
      await Promise.all([
        createClient({ ...INPUT, companyName: "cnbiz", email: "race@example.com" }, storeA),
        createClient({ ...INPUT, companyName: "사색찬미한정식", email: "race@example.com" }, storeB),
      ]);

      const all = await findClientsByEmail("race@example.com", store);
      expect(all.map((c) => c.companyName).sort()).toEqual(["cnbiz", "사색찬미한정식"]);
    });

    it("(대조군) 옛 list()+replaceAll() 방식이었다면 이 경합에서 실제로 유실됐음을 확인", async () => {
      // 수정 전 코드가 실제로 이 문제를 일으켰음을 증명하기 위한 대조군 — createClient()가
      // 아직도 list()+push()+replaceAll()을 쓴다면 이 테스트가 실패해야 정상이다.
      const storeA = createFsStore(baseDir);
      const storeB = createFsStore(baseDir);

      async function legacyCreateClient(input: ClientInput, s: ReturnType<typeof createFsStore>) {
        const records = await s.list<{ id: string } & ClientInput>("clients");
        // 일부러 그 사이에 다른 인스턴스가 끼어들 시간을 준다.
        await new Promise((resolve) => setTimeout(resolve, 10));
        records.push({ id: `client-${input.companyName}`, ...input });
        await s.replaceAll("clients", records);
      }

      await Promise.all([
        legacyCreateClient({ ...INPUT, companyName: "cnbiz", email: "race2@example.com" }, storeA),
        legacyCreateClient({ ...INPUT, companyName: "사색찬미한정식", email: "race2@example.com" }, storeB),
      ]);

      const all = await findClientsByEmail("race2@example.com", store);
      // 늦게 replaceAll()한 쪽이 먼저 쓴 쪽의 스냅샷을 덮어써 하나만 남는다 — 실제 유실 재현.
      expect(all.length).toBeLessThan(2);
    });
  });
});
