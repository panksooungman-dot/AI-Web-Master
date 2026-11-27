import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

/** public/deposit-sw.js 를 가짜 서비스 워커 환경에서 실행해, 알림 클릭이 확인 요청으로 이어지는지 본다. */
function load(fetchImpl: (url: string, init: RequestInit) => Promise<{ ok: boolean }>) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const opened: string[] = [];
  const self = {
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      handlers[type] = fn;
    },
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn(),
      matchAll: async () => [],
      openWindow: async (u: string) => void opened.push(u),
    },
  };
  const code = fs.readFileSync(path.join(__dirname, "../../public/deposit-sw.js"), "utf-8");
  vm.runInNewContext(code, { self, fetch: fetchImpl, JSON, Promise });
  return { handlers, opened };
}

function click(handlers: Record<string, (e: unknown) => void>, data: unknown) {
  let work: Promise<unknown> = Promise.resolve();
  const closed = vi.fn();
  handlers.notificationclick({ notification: { data, close: closed }, waitUntil: (p: Promise<unknown>) => (work = p) });
  return { work, closed };
}

describe("입금 알림 서비스 워커", () => {
  it("알림을 누르면 그 입금을 확인 완료로 처리하고 알림을 닫는다(사이트를 열지 않는다)", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const { handlers, opened } = load(async (url, init) => {
      calls.push({ url, init });
      return { ok: true };
    });
    const { work, closed } = click(handlers, { id: "dep-1" });
    await work;
    expect(closed).toHaveBeenCalled();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/deposits");
    expect(calls[0].init.method).toBe("PATCH");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ id: "dep-1", confirmed: true });
    expect(opened).toEqual([]);
  });

  it("확인 요청이 실패하면 입금 확인 화면을 열어 직원이 직접 확인할 수 있게 한다", async () => {
    const { handlers, opened } = load(async () => ({ ok: false }));
    await click(handlers, { id: "dep-2" }).work;
    expect(opened).toEqual(["/deposits"]);
    const failing = load(async () => {
      throw new Error("offline");
    });
    await click(failing.handlers, { id: "dep-3" }).work;
    expect(failing.opened).toEqual(["/deposits"]);
  });

  it("입금 정보가 없는 알림은 아무것도 요청하지 않고 닫기만 한다", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true }));
    const { handlers } = load(fetchSpy);
    const { closed } = click(handlers, null);
    expect(closed).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
