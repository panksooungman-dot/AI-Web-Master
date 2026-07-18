import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listAuditEvents, recordAuditEvent } from "../../lib/audit/log";

describe("Audit Log — lib/audit/log.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-log-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listAuditEvents() returns an empty array before anything is recorded", () => {
    expect(listAuditEvents({}, baseDir)).toEqual([]);
  });

  it("recordAuditEvent() assigns an id/timestamp and persists to lib/data/audit-log.json", () => {
    const recorded = recordAuditEvent(
      { action: "auth.login", actor: "test@example.com", success: true, detail: "로그인 성공" },
      baseDir
    );

    expect(recorded.id).toBeTruthy();
    expect(recorded.timestamp).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "audit-log.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(recorded.id);
  });

  it("listAuditEvents() returns entries newest first", () => {
    recordAuditEvent({ action: "auth.login", actor: "a@example.com", success: true, detail: "first" }, baseDir);
    recordAuditEvent({ action: "auth.login", actor: "b@example.com", success: true, detail: "second" }, baseDir);

    const entries = listAuditEvents({}, baseDir);
    expect(entries.map((e) => e.detail)).toEqual(["second", "first"]);
  });

  it("listAuditEvents() filters by action", () => {
    recordAuditEvent({ action: "auth.login", actor: null, success: true, detail: "login" }, baseDir);
    recordAuditEvent({ action: "auth.logout", actor: null, success: true, detail: "logout" }, baseDir);

    const entries = listAuditEvents({ action: "auth.logout" }, baseDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].detail).toBe("logout");
  });

  it("listAuditEvents() filters by failuresOnly / successOnly", () => {
    recordAuditEvent({ action: "website.generate", actor: null, success: true, detail: "ok" }, baseDir);
    recordAuditEvent({ action: "website.generate", actor: null, success: false, detail: "boom" }, baseDir);

    expect(listAuditEvents({ failuresOnly: true }, baseDir).map((e) => e.detail)).toEqual(["boom"]);
    expect(listAuditEvents({ successOnly: true }, baseDir).map((e) => e.detail)).toEqual(["ok"]);
  });

  it("listAuditEvents() respects limit", () => {
    for (let i = 0; i < 5; i += 1) {
      recordAuditEvent({ action: "ai.task", actor: null, success: true, detail: `task-${i}` }, baseDir);
    }

    expect(listAuditEvents({ limit: 2 }, baseDir)).toHaveLength(2);
  });

  it("trims stored history beyond the max entry cap", () => {
    for (let i = 0; i < 505; i += 1) {
      recordAuditEvent({ action: "build.run", actor: null, success: true, detail: `build-${i}` }, baseDir);
    }

    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, "audit-log.json"), "utf-8"));
    expect(raw.length).toBe(500);
    // Oldest entries were dropped — the earliest surviving one should be build-5 (0..4 trimmed).
    expect(raw[0].detail).toBe("build-5");
    expect(raw[raw.length - 1].detail).toBe("build-504");
  });
});
