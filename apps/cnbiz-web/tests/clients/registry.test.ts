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
});
