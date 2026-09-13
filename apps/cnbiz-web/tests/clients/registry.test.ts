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
});
