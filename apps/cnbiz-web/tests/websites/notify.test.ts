import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { notifyCustomerOfDeployment, triggerCustomerNotification } from "../../lib/websites/notify";
import { listAuditEvents } from "../../lib/audit/log";
import { createAiJob } from "../../lib/aiJobs/registry";
import { createWebsiteOrder, addWebsiteToOrder } from "../../lib/websiteOrders/registry";
import { createWebsiteRecord, updateWebsiteDeployment } from "../../lib/websites/registry";
import { createClient } from "../../lib/clients/registry";
import type { ClientRecord } from "../../lib/clients/types";
import type { WebsiteOrderRecord } from "../../lib/websiteOrders/types";
import type { WebsiteRecord } from "../../lib/websites/registry";
import type { ContactEmailPayload, EmailProvider } from "../../lib/contact/email/types";

const CLIENT: ClientRecord = {
  id: "client-1",
  companyName: "테스트치과",
  contactName: "홍길동",
  email: "customer@example.com",
  phone: "010-0000-0000",
  inquiryIds: [],
  websiteOrderIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const ORDER: WebsiteOrderRecord = {
  id: "order-1",
  clientId: "client-1",
  inquiryId: "inquiry-1",
  name: "테스트치과 홈페이지",
  siteType: "dental",
  requirements: "x",
  status: "Requested",
  aiJobIds: [],
  websiteIds: ["website-1"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const WEBSITE_WITH_DEPLOYMENT: WebsiteRecord = {
  id: "website-1",
  name: "테스트치과 홈페이지",
  siteType: "dental",
  outDir: "/tmp/out",
  status: "Success",
  simulatedContent: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  deploymentStatus: "Success",
  deployment: {
    vercelProjectId: "prj_abc",
    vercelProjectName: "dental-abcdef01",
    deploymentId: "dpl_abc",
    url: "https://dental-abcdef01-xyz-team.vercel.app",
  },
};

describe("Customer Deployment Notification — lib/websites/notify.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;
  let originalFrom: string | undefined;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "notify-test-"));
    store = createFsStore(baseDir);
    originalFrom = process.env.CONTACT_EMAIL_FROM;
    process.env.CONTACT_EMAIL_FROM = "noreply@cnbiz.kr";
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
    if (originalFrom === undefined) delete process.env.CONTACT_EMAIL_FROM;
    else process.env.CONTACT_EMAIL_FROM = originalFrom;
  });

  it("sends an email to the client using the production alias (not the per-deployment URL) and records a success audit event", async () => {
    const sent: ContactEmailPayload[] = [];
    const fakeProvider: EmailProvider = {
      async send(payload) {
        sent.push(payload);
      },
    };

    await notifyCustomerOfDeployment(CLIENT, ORDER, WEBSITE_WITH_DEPLOYMENT, fakeProvider, store);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("customer@example.com");
    expect(sent[0].from).toBe("noreply@cnbiz.kr");
    expect(sent[0].text).toContain("https://dental-abcdef01.vercel.app");
    expect(sent[0].text).not.toContain(WEBSITE_WITH_DEPLOYMENT.deployment!.url);

    const events = await listAuditEvents({ action: "deployment.notify_customer" }, store);
    expect(events).toHaveLength(1);
    expect(events[0].success).toBe(true);
    expect(events[0].detail).toContain("customer@example.com");
  });

  it("does nothing when the website has no deployment info yet", async () => {
    const sent: ContactEmailPayload[] = [];
    const fakeProvider: EmailProvider = {
      async send(payload) {
        sent.push(payload);
      },
    };
    const noDeployment: WebsiteRecord = { ...WEBSITE_WITH_DEPLOYMENT, deployment: undefined };

    await notifyCustomerOfDeployment(CLIENT, ORDER, noDeployment, fakeProvider, store);

    expect(sent).toHaveLength(0);
    expect(await listAuditEvents({ action: "deployment.notify_customer" }, store)).toHaveLength(0);
  });

  it("skips silently when CONTACT_EMAIL_FROM is not configured", async () => {
    delete process.env.CONTACT_EMAIL_FROM;
    const sent: ContactEmailPayload[] = [];
    const fakeProvider: EmailProvider = {
      async send(payload) {
        sent.push(payload);
      },
    };

    await notifyCustomerOfDeployment(CLIENT, ORDER, WEBSITE_WITH_DEPLOYMENT, fakeProvider, store);

    expect(sent).toHaveLength(0);
    expect(await listAuditEvents({ action: "deployment.notify_customer" }, store)).toHaveLength(0);
  });

  it("records a failure audit event (and does not throw) when the provider rejects", async () => {
    const fakeProvider: EmailProvider = {
      async send() {
        throw new Error("Resend API error (500): boom");
      },
    };

    await expect(
      notifyCustomerOfDeployment(CLIENT, ORDER, WEBSITE_WITH_DEPLOYMENT, fakeProvider, store)
    ).resolves.toBeUndefined();

    const events = await listAuditEvents({ action: "deployment.notify_customer" }, store);
    expect(events).toHaveLength(1);
    expect(events[0].success).toBe(false);
    expect(events[0].detail).toContain("boom");
  });
});

describe("Customer Deployment Notification — triggerCustomerNotification() (Lifecycle Hook 어댑터가 호출하는 조합 함수)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-notify-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  async function setupDeployedOrder(store: ReturnType<typeof createFsStore>) {
    const client = await createClient(
      { companyName: "테스트치과", contactName: "홍길동", email: "customer@example.com", phone: "010-0000-0000" },
      store
    );
    const order = await createWebsiteOrder(
      { clientId: client.id, inquiryId: "inquiry-1", name: "테스트치과 홈페이지", siteType: "dental", requirements: "x" },
      store
    );
    const website = await createWebsiteRecord(
      { name: "테스트치과 홈페이지", siteType: "dental", outDir: "/tmp/out", status: "Success", simulatedContent: false },
      store
    );
    await addWebsiteToOrder(order.id, website.id, store);
    await updateWebsiteDeployment(
      website.id,
      {
        deploymentStatus: "Success",
        deployment: { vercelProjectId: "prj_x", vercelProjectName: "dental-x", deploymentId: "dpl_x", url: "https://dental-x-team.vercel.app" },
      },
      store
    );
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);
    return { client, order, job };
  }

  it("calls notifyFn with the client/order/deployed-website when deployment succeeded", async () => {
    const { job, client, order } = await setupDeployedOrder(store);

    const calls: [ClientRecord, WebsiteOrderRecord, WebsiteRecord][] = [];
    const fakeNotify = async (client: ClientRecord, order: WebsiteOrderRecord, website: WebsiteRecord) => {
      calls.push([client, order, website]);
    };

    await triggerCustomerNotification(job.id, fakeNotify, store);

    expect(calls).toHaveLength(1);
    expect(calls[0][0].email).toBe(client.email);
    expect(calls[0][1].id).toBe(order.id);
    expect(calls[0][2].deploymentStatus).toBe("Success");
  });

  it("does nothing when the website's deploymentStatus is not Success", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    const website = await createWebsiteRecord(
      { name: "테스트", siteType: "restaurant", outDir: "/tmp/x", status: "Success", simulatedContent: false },
      store
    );
    await addWebsiteToOrder(order.id, website.id, store);
    await updateWebsiteDeployment(website.id, { deploymentStatus: "NotConfigured" }, store);
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    let called = false;
    await triggerCustomerNotification(job.id, async () => { called = true; }, store);

    expect(called).toBe(false);
  });

  it("does nothing when the client has no email on record", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-does-not-exist", inquiryId: "inquiry-1", name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    const website = await createWebsiteRecord(
      { name: "테스트", siteType: "restaurant", outDir: "/tmp/x", status: "Success", simulatedContent: false },
      store
    );
    await addWebsiteToOrder(order.id, website.id, store);
    await updateWebsiteDeployment(
      website.id,
      { deploymentStatus: "Success", deployment: { vercelProjectId: "p", vercelProjectName: "p", deploymentId: "d", url: "https://x.vercel.app" } },
      store
    );
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    let called = false;
    await triggerCustomerNotification(job.id, async () => { called = true; }, store);

    expect(called).toBe(false);
  });

  it("does nothing when the WebsiteOrder has no attached websites yet", async () => {
    const order = await createWebsiteOrder(
      { clientId: "client-1", inquiryId: "inquiry-1", name: "테스트", siteType: "restaurant", requirements: "x" },
      store
    );
    const job = await createAiJob({ websiteOrderId: order.id, type: "generate_website", payload: {} }, store);

    let called = false;
    await triggerCustomerNotification(job.id, async () => { called = true; }, store);

    expect(called).toBe(false);
  });

  it("does nothing when the job does not exist", async () => {
    let called = false;
    await triggerCustomerNotification("does-not-exist", async () => { called = true; }, store);

    expect(called).toBe(false);
  });
});
