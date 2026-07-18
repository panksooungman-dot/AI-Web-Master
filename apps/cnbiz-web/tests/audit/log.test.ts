import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { listAuditEvents, recordAuditEvent } from "../../lib/audit/log";

describe("Audit Log — lib/audit/log.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-log-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listAuditEvents() returns an empty array before anything is recorded", async () => {
    expect(await listAuditEvents({}, store)).toEqual([]);
  });

  it("recordAuditEvent() assigns an id/timestamp and persists to lib/data/audit-log.json", async () => {
    const recorded = await recordAuditEvent(
      { action: "auth.login", actor: "test@example.com", success: true, detail: "로그인 성공" },
      store
    );

    expect(recorded.id).toBeTruthy();
    expect(recorded.timestamp).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "audit-log.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(recorded.id);
  });

  it("listAuditEvents() returns entries newest first", async () => {
    await recordAuditEvent({ action: "auth.login", actor: "a@example.com", success: true, detail: "first" }, store);
    await recordAuditEvent({ action: "auth.login", actor: "b@example.com", success: true, detail: "second" }, store);

    const entries = await listAuditEvents({}, store);
    expect(entries.map((e) => e.detail)).toEqual(["second", "first"]);
  });

  it("listAuditEvents() filters by action", async () => {
    await recordAuditEvent({ action: "auth.login", actor: null, success: true, detail: "login" }, store);
    await recordAuditEvent({ action: "auth.logout", actor: null, success: true, detail: "logout" }, store);

    const entries = await listAuditEvents({ action: "auth.logout" }, store);
    expect(entries).toHaveLength(1);
    expect(entries[0].detail).toBe("logout");
  });

  it("listAuditEvents() filters by failuresOnly / successOnly", async () => {
    await recordAuditEvent({ action: "website.generate", actor: null, success: true, detail: "ok" }, store);
    await recordAuditEvent({ action: "website.generate", actor: null, success: false, detail: "boom" }, store);

    expect((await listAuditEvents({ failuresOnly: true }, store)).map((e) => e.detail)).toEqual(["boom"]);
    expect((await listAuditEvents({ successOnly: true }, store)).map((e) => e.detail)).toEqual(["ok"]);
  });

  it("listAuditEvents() respects limit", async () => {
    for (let i = 0; i < 5; i += 1) {
      await recordAuditEvent({ action: "ai.task", actor: null, success: true, detail: `task-${i}` }, store);
    }

    expect(await listAuditEvents({ limit: 2 }, store)).toHaveLength(2);
  });

  it("trims stored history beyond the max entry cap", async () => {
    for (let i = 0; i < 505; i += 1) {
      await recordAuditEvent({ action: "build.run", actor: null, success: true, detail: `build-${i}` }, store);
    }

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "audit-log.json"), "utf-8"));
    expect(raw.length).toBe(500);
    // Oldest entries were dropped — the earliest surviving one should be build-5 (0..4 trimmed).
    expect(raw[0].detail).toBe("build-5");
    expect(raw[raw.length - 1].detail).toBe("build-504");
  });
});
