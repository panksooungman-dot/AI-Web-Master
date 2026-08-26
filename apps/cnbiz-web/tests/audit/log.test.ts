import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("listAuditEvents() still orders by insertion when two entries share the exact same millisecond timestamp", async () => {
    // recordAuditEvent()가 정렬 기준으로 쓰는 timestamp는 1ms 해상도라, 같은 밀리초에 연속
    // 기록되면 문자열 비교만으로는 둘을 구분할 수 없다(SOLAPI Audit Log 기록이 유실되던 원인을
    // 고치며 timestamp 정렬로 바꾼 뒤 실제로 이 경합 상황에서 순서가 뒤집히는 회귀를 발견해
    // 고정한 케이스 — 시각을 고정해 우연한 타이밍에 기대지 않고 항상 재현되도록 함).
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      await recordAuditEvent({ action: "auth.login", actor: "a@example.com", success: true, detail: "first" }, store);
      await recordAuditEvent({ action: "auth.login", actor: "b@example.com", success: true, detail: "second" }, store);
    } finally {
      vi.useRealTimers();
    }

    const entries = await listAuditEvents({}, store);
    expect(entries.map((e) => e.timestamp)).toEqual([entries[0].timestamp, entries[0].timestamp]);
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
