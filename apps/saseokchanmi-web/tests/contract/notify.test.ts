import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildMessage, notifySubmission, safeName, solapiAuthHeader } from "@/lib/contract/server/notify";

const ok = () => new Response("ok", { status: 200 });

describe("서명 제출 알림", () => {
  it("환경변수가 없으면 아무것도 보내지 않는다", async () => {
    const f = vi.fn(ok);
    expect(await notifySubmission("홍길동", {}, f as unknown as typeof fetch)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("Slack: 이름과 관리자 링크만 JSON으로 보내고, 전화번호·주소는 들어가지 않는다", async () => {
    const f = vi.fn(ok);
    const r = await notifySubmission("홍길동", { SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/X" }, f as unknown as typeof fetch);
    expect(r).toEqual([{ channel: "slack", ok: true }]);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://hooks.slack.com/services/T/B/X");
    const text = JSON.parse(String(init.body)).text as string;
    expect(text).toContain("홍길동님이 근로계약서에 서명했습니다");
    expect(text).toContain("/admin/submissions");
  });

  it("Slack 주소 형식이 아니면 보내지 않는다(다른 곳으로 요청이 나가지 않게)", async () => {
    const f = vi.fn(ok);
    expect(await notifySubmission("홍길동", { SLACK_WEBHOOK_URL: "https://evil.example.com/x" }, f as unknown as typeof fetch)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("이름에 섞인 Slack 멘션·링크·서식 문자는 없앤다", () => {
    expect(safeName("<!channel> *홍길동*")).toBe("!channel 홍길동");
    expect(safeName("<https://x.com|클릭>")).not.toMatch(/[<>|]/);
    expect(safeName("   ")).toBe("근로자");
    expect(safeName("가".repeat(50)).length).toBe(20);
    expect(buildMessage("<!here>")).not.toContain("<");
  });

  it("SOLAPI: HMAC-SHA256 서명 헤더와 요청 본문 형식을 지킨다", async () => {
    const date = new Date("2026-11-15T00:00:00.000Z");
    const header = solapiAuthHeader("KEY", "SECRET", date, "salt123");
    const sig = createHmac("sha256", "SECRET").update("2026-11-15T00:00:00.000Zsalt123").digest("hex");
    expect(header).toBe(`HMAC-SHA256 apiKey=KEY, date=2026-11-15T00:00:00.000Z, salt=salt123, signature=${sig}`);

    const f = vi.fn(async () => new Response(JSON.stringify({ groupInfo: { count: { total: 1, registeredFailed: 0 } } }), { status: 200 }));
    const env = { SOLAPI_API_KEY: "KEY", SOLAPI_API_SECRET: "SECRET", SOLAPI_FROM: "031-111-2222", SOLAPI_TO: "010-1234-5678" };
    expect(await notifySubmission("홍길동", env, f as unknown as typeof fetch)).toEqual([{ channel: "solapi", ok: true }]);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.solapi.com/messages/v4/send-many/detail");
    expect((init.headers as Record<string, string>).authorization).toMatch(/^HMAC-SHA256 apiKey=KEY, date=.+, salt=[0-9a-f]{32}, signature=[0-9a-f]{64}$/);
    const msg = JSON.parse(String(init.body)).messages[0];
    expect(msg).toMatchObject({ to: "01012345678", from: "0311112222" });
    expect(msg.text).toContain("홍길동님");
  });

  it("SOLAPI 값이 하나라도 빠지면 켜지지 않는다", async () => {
    const f = vi.fn(ok);
    expect(await notifySubmission("홍길동", { SOLAPI_API_KEY: "K", SOLAPI_API_SECRET: "S", SOLAPI_TO: "010" }, f as unknown as typeof fetch)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("실패해도 예외를 던지지 않고, 채널끼리 서로 영향이 없다", async () => {
    const f = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("slack")) throw new Error("boom");
      return new Response(JSON.stringify({ groupInfo: { count: { total: 1, registeredFailed: 1 } } }), { status: 200 });
    });
    const env = { SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/X", SOLAPI_API_KEY: "K", SOLAPI_API_SECRET: "S", SOLAPI_FROM: "031", SOLAPI_TO: "010" };
    const r = await notifySubmission("홍길동", env, f as unknown as typeof fetch);
    expect(r).toEqual([
      { channel: "slack", ok: false, error: "Error" },
      { channel: "solapi", ok: false, error: "접수 실패" },
    ]);
  });

  it("HTTP 오류 응답은 실패로 기록한다", async () => {
    const f = vi.fn(async () => new Response("no", { status: 404 }));
    expect(await notifySubmission("홍길동", { SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/X" }, f as unknown as typeof fetch)).toEqual([
      { channel: "slack", ok: false, error: "HTTP 404" },
    ]);
  });
});
