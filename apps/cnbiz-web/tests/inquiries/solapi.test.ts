import { afterEach, describe, expect, it, vi } from "vitest";
import { createSolapiNotifier } from "../../lib/inquiries/solapi";

describe("createSolapiNotifier — lib/inquiries/solapi.ts", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls the real SOLAPI send-many/detail endpoint with a correctly-shaped HMAC-SHA256 Authorization header and body", async () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;
    global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(
        JSON.stringify({
          failedMessageList: [],
          groupInfo: { count: { total: 1, registeredFailed: 0 } },
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const notifier = createSolapiNotifier("test-key", "test-secret", "01012345678", "01087654321");
    await notifier.send("테스트 메시지");

    expect(capturedUrl).toBe("https://api.solapi.com/messages/v4/send-many/detail");
    expect(capturedInit?.method).toBe("POST");

    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");

    // Authorization: HMAC-SHA256 apiKey=..., date=..., salt=..., signature=...
    const auth = headers.Authorization;
    expect(auth).toMatch(/^HMAC-SHA256 apiKey=test-key, date=.+, salt=.{32}, signature=[0-9a-f]{64}$/);

    const body = JSON.parse(capturedInit?.body as string);
    expect(body).toEqual({
      messages: [{ to: "01012345678", from: "01087654321", text: "테스트 메시지" }],
    });
  });

  it("throws with the response body when the HTTP response is not ok", async () => {
    global.fetch = vi.fn(async () => new Response("Unauthorized", { status: 401 })) as unknown as typeof fetch;

    const notifier = createSolapiNotifier("bad-key", "bad-secret", "01012345678", "01087654321");
    await expect(notifier.send("테스트")).rejects.toThrow(/SOLAPI error \(401\)/);
  });

  it("throws when every message in the batch is reported as failed even on a 2xx response (mirrors the official SDK's failedAll rule)", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            failedMessageList: [{ to: "01012345678", statusMessage: "발신번호 미등록" }],
            groupInfo: { count: { total: 1, registeredFailed: 1 } },
          }),
          { status: 200 }
        )
    ) as unknown as typeof fetch;

    const notifier = createSolapiNotifier("test-key", "test-secret", "01012345678", "01099999999");
    await expect(notifier.send("테스트")).rejects.toThrow(/SOLAPI message not received/);
  });

  it("does not throw when the 2xx response reports no failures", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ failedMessageList: [], groupInfo: { count: { total: 1, registeredFailed: 0 } } }),
          { status: 200 }
        )
    ) as unknown as typeof fetch;

    const notifier = createSolapiNotifier("test-key", "test-secret", "01012345678", "01087654321");
    await expect(notifier.send("테스트")).resolves.toBeUndefined();
  });
});
