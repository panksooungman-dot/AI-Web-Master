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
  findOrCreateClientByEmail,
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

  it("findOrCreateClientByEmail() reuses an existing client instead of duplicating", async () => {
    const created = await createClient(INPUT, store);
    const found = await findOrCreateClientByEmail(INPUT, store);

    expect(found.id).toBe(created.id);
    expect((await getClient(created.id, store)) !== undefined).toBe(true);
  });

  it("findOrCreateClientByEmail() creates a new client when no match exists", async () => {
    const record = await findOrCreateClientByEmail(INPUT, store);
    expect(record.email).toBe(INPUT.email);
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
