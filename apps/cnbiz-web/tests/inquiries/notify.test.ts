import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { notifyAdminOfNewInquiry } from "../../lib/inquiries/notify";
import { listAuditEvents } from "../../lib/audit/log";
import type { InquiryRecord } from "../../lib/inquiries/types";
import type { ClientRecord } from "../../lib/clients/types";
import type { WebsiteOrderRecord } from "../../lib/websiteOrders/types";
import type { ContactEmailPayload, EmailProvider } from "../../lib/contact/email/types";

const INQUIRY: InquiryRecord = {
  id: "inquiry-1",
  source: "manual",
  companyName: "테스트회사",
  contactName: "홍길동",
  email: "hong@example.com",
  phone: "010-0000-0000",
  siteType: "shopping",
  requirements: "쇼핑몰을 만들고 싶습니다.",
  status: "New",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const CLIENT: ClientRecord = {
  id: "client-1",
  companyName: "테스트회사",
  contactName: "홍길동",
  email: "hong@example.com",
  phone: "010-0000-0000",
  inquiryIds: ["inquiry-1"],
  websiteOrderIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const ORDER: WebsiteOrderRecord = {
  id: "order-1",
  clientId: "client-1",
  inquiryId: "inquiry-1",
  name: "테스트회사 홈페이지 제작",
  siteType: "shopping",
  requirements: "쇼핑몰을 만들고 싶습니다.",
  status: "Requested",
  aiJobIds: [],
  websiteIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Admin Inquiry Notification — lib/inquiries/notify.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;
  let originalTo: string | undefined;
  let originalFrom: string | undefined;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "inquiry-notify-test-"));
    store = createFsStore(baseDir);
    originalTo = process.env.CONTACT_EMAIL_TO;
    originalFrom = process.env.CONTACT_EMAIL_FROM;
    process.env.CONTACT_EMAIL_TO = "admin@cnbiz.kr";
    process.env.CONTACT_EMAIL_FROM = "noreply@cnbiz.kr";
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
    if (originalTo === undefined) delete process.env.CONTACT_EMAIL_TO;
    else process.env.CONTACT_EMAIL_TO = originalTo;
    if (originalFrom === undefined) delete process.env.CONTACT_EMAIL_FROM;
    else process.env.CONTACT_EMAIL_FROM = originalFrom;
  });

  it("sends the admin notification email and records a success audit event", async () => {
    const sent: ContactEmailPayload[] = [];
    const fakeProvider: EmailProvider = {
      async send(payload) {
        sent.push(payload);
      },
    };

    await notifyAdminOfNewInquiry(INQUIRY, CLIENT, ORDER, fakeProvider, store);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("admin@cnbiz.kr");
    expect(sent[0].from).toBe("noreply@cnbiz.kr");
    expect(sent[0].text).toContain("테스트회사");
    expect(sent[0].text).toContain(INQUIRY.id);

    const events = await listAuditEvents({ action: "inquiry.notify_admin" }, store);
    expect(events).toHaveLength(1);
    expect(events[0].success).toBe(true);
    expect(events[0].detail).toContain("admin@cnbiz.kr");
  });

  it("skips sending and records a failure audit event naming the missing env vars when CONTACT_EMAIL_TO/FROM are not set", async () => {
    delete process.env.CONTACT_EMAIL_TO;
    delete process.env.CONTACT_EMAIL_FROM;
    const sent: ContactEmailPayload[] = [];
    const fakeProvider: EmailProvider = {
      async send(payload) {
        sent.push(payload);
      },
    };

    await notifyAdminOfNewInquiry(INQUIRY, CLIENT, ORDER, fakeProvider, store);

    expect(sent).toHaveLength(0);
    const events = await listAuditEvents({ action: "inquiry.notify_admin" }, store);
    expect(events).toHaveLength(1);
    expect(events[0].success).toBe(false);
    expect(events[0].detail).toContain("CONTACT_EMAIL_TO");
    expect(events[0].detail).toContain("CONTACT_EMAIL_FROM");
  });

  it("records a failure audit event (and does not throw) when the provider rejects", async () => {
    const fakeProvider: EmailProvider = {
      async send() {
        throw new Error("Resend API error (401): invalid API key");
      },
    };

    await expect(
      notifyAdminOfNewInquiry(INQUIRY, CLIENT, ORDER, fakeProvider, store)
    ).resolves.toBeUndefined();

    const events = await listAuditEvents({ action: "inquiry.notify_admin" }, store);
    expect(events).toHaveLength(1);
    expect(events[0].success).toBe(false);
    expect(events[0].detail).toContain("invalid API key");
  });
});
