import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { ingestAuth, ingestDepositSms, readSmsText, sinceKstDays, depositBoard, updateDepositState } from "@/lib/contract/server/deposits";
import { setStoreForTests } from "@/lib/contract/server/select";
import type { ContractStore } from "@/lib/contract/server/store";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as devicePost } from "@/app/api/admin/clock/device/route";
import { POST as ingestPost } from "@/app/api/deposits/ingest/route";
import { GET as boardGet, PATCH as boardPatch } from "@/app/api/deposits/route";
import { GET as settingsGet, PUT as settingsPut } from "@/app/api/admin/deposits/settings/route";

const ORIGIN = "http://localhost:4100";
const SECRET = "deposit-secret-0123456789abcdef";
const NOW = new Date("2026-11-26T10:31:00.000Z"); // 한국 시간 19:31
const SMS = "[Web발신]\n농협 입금1,000원\n11/26 19:30\n301-****-4369-51\n박성만";
const CARD_SMS = "농협 입금152,300원\n11/26 19:00\n301-****-4369-51\n삼성카드";

let store: ContractStore;
let admin = "";

const req = (path: string, o: { method?: string; body?: BodyInit | null; headers?: Record<string, string>; origin?: string | null } = {}) => {
  const headers: Record<string, string> = { ...o.headers };
  if (o.origin !== null && o.method && o.method !== "GET") headers.origin = o.origin ?? ORIGIN;
  return new Request(ORIGIN + path, { method: o.method ?? "GET", headers, body: o.body ?? undefined });
};
const withSecret = (extra: Record<string, string> = {}) => ({ authorization: `Bearer ${SECRET}`, ...extra });
const data = async (r: Response) => (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

beforeEach(async () => {
  store = createMemoryStore();
  setStoreForTests(store);
  process.env.CONTRACT_ADMIN_PASSWORD = "correct-horse-battery";
  process.env.CONTRACT_SESSION_SECRET = "s".repeat(40);
  process.env.DEPOSIT_INGEST_SECRET = SECRET;
  delete process.env.DATABASE_URL;
  const res = await login(req("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "correct-horse-battery" }) }));
  admin = res.headers.get("set-cookie")!.split(";")[0];
});

describe("입금 문자 접수(서비스)", () => {
  it("입금 문자를 저장하고, 같은 문자가 다시 오면 중복으로 건너뛴다", async () => {
    const r = await ingestDepositSms(store, SMS, NOW);
    expect(r.body).toMatchObject({ ok: true, saved: true, reason: "saved" });
    expect((await store.listDeposits())[0]).toMatchObject({ amount: 1000, depositor: "박성만", occurredAt: "2026-11-26T10:30:00.000Z", confirmedAt: null, memo: "" });
    expect((await ingestDepositSms(store, SMS, NOW)).body).toMatchObject({ saved: false, reason: "duplicate" });
    expect(await store.listDeposits()).toHaveLength(1);
  });

  it("저장하는 값에 계좌번호·잔액·문자 원문이 없다", async () => {
    await ingestDepositSms(store, SMS, NOW);
    const saved = JSON.stringify(await store.listDeposits());
    expect(saved).not.toContain("4369");
    expect(saved).not.toContain("301-");
    expect(saved).not.toContain("Web발신");
  });

  it("출금·상관없는 문자는 저장하지 않지만, 폰이 살아 있다는 표시(마지막 수신 시각)는 갱신한다", async () => {
    expect((await ingestDepositSms(store, "농협 출금28,380원\n11/26 19:16\n301-****-4369-51\n파주농협", NOW)).body).toMatchObject({ saved: false, reason: "withdrawal" });
    expect((await ingestDepositSms(store, "[NH농협] 이벤트 안내", NOW)).body).toMatchObject({ saved: false, reason: "ignored" });
    expect(await store.listDeposits()).toEqual([]);
    expect((await store.getDepositSettings()).lastIngestAt).toBe(NOW.toISOString());
  });

  it("카드사 정산 입금은 저장하지 않고, 사장님이 추가한 이름도 제외한다", async () => {
    expect((await ingestDepositSms(store, CARD_SMS, NOW)).body).toMatchObject({ saved: false, reason: "excluded" });
    const van = "농협 입금88,000원\n11/26 19:10\n301-****-4369-51\n나이스정보통신";
    expect((await ingestDepositSms(store, van, NOW)).body).toMatchObject({ saved: true });
    await store.putDepositExcludes(["나이스"]);
    const van2 = "농협 입금77,000원\n11/26 19:11\n301-****-4369-51\n나이스정보통신";
    expect((await ingestDepositSms(store, van2, NOW)).body).toMatchObject({ saved: false, reason: "excluded" });
    expect((await store.listDeposits()).map((d) => d.amount)).toEqual([88000]);
  });

  it("입금 문자 같은데 읽지 못하면 버리지 않고 해석 실패로 남긴다", async () => {
    const r = await ingestDepositSms(store, "농협 입금 확인바랍니다 문의 1588-2100", NOW);
    expect(r.body).toMatchObject({ saved: true, reason: "unparsed" });
    expect((await store.listDeposits())[0]).toMatchObject({ unparsed: true, amount: 0, depositor: "(해석 실패)", memo: "농협 입금 확인바랍니다 문의 1588-2100" });
  });

  it("90일이 지난 입금은 새 입금이 들어올 때 정리한다", async () => {
    await store.insertDeposit({ id: "old", amount: 1, depositor: "옛날", occurredAt: "2026-08-01T00:00:00.000Z", receivedAt: "2026-08-01T00:00:00.000Z", confirmedAt: null, memo: "" });
    await store.insertDeposit({ id: "mid", amount: 2, depositor: "최근", occurredAt: "2026-09-10T00:00:00.000Z", receivedAt: "2026-09-10T00:00:00.000Z", confirmedAt: null, memo: "" });
    await ingestDepositSms(store, SMS, NOW);
    expect((await store.listDeposits()).map((d) => d.id).sort()).toHaveLength(2);
    expect((await store.listDeposits()).some((d) => d.id === "old")).toBe(false);
  });
});

describe("입금 확인 처리·조회(서비스)", () => {
  it("오늘 입금만 보여 주고, 최신이 먼저이며, 기간은 1~31일로 제한한다", async () => {
    await ingestDepositSms(store, SMS, NOW);
    await ingestDepositSms(store, "농협 입금2,000원\n11/26 19:20\n301-****-4369-51\n김철수", NOW);
    await ingestDepositSms(store, "농협 입금3,000원\n11/25 12:00\n301-****-4369-51\n이영희", NOW); // 어제
    const today = (await depositBoard(store, "1", NOW)).body;
    expect((today.deposits as { amount: number }[]).map((d) => d.amount)).toEqual([1000, 2000]);
    expect(today).toMatchObject({ days: 1, serverNow: NOW.toISOString(), lastIngestAt: NOW.toISOString() });
    expect(((await depositBoard(store, "7", NOW)).body.deposits as unknown[]).length).toBe(3);
    expect((await depositBoard(store, "999", NOW)).body.days).toBe(1);
    expect(sinceKstDays(1, NOW)).toBe("2026-11-25T15:00:00.000Z"); // 한국 시간 11/26 0시
  });

  it("확인 표시와 메모를 저장하고, 취소하면 다시 미확인이 되며, 없는 건은 404", async () => {
    await ingestDepositSms(store, SMS, NOW);
    const id = (await store.listDeposits())[0].id;
    expect((await updateDepositState(store, { id, confirmed: true, memo: "  7번   테이블 " }, NOW)).body.deposit).toMatchObject({ confirmedAt: NOW.toISOString(), memo: "7번 테이블" });
    expect((await updateDepositState(store, { id, confirmed: false }, NOW)).body.deposit).toMatchObject({ confirmedAt: null, memo: "7번 테이블" });
    expect((await updateDepositState(store, { id: "nope", confirmed: true }, NOW)).status).toBe(404);
    expect((await updateDepositState(store, { id }, NOW)).status).toBe(400);
    expect((await updateDepositState(store, { id, confirmed: "yes" }, NOW)).status).toBe(400);
    expect((await updateDepositState(store, { confirmed: true }, NOW)).status).toBe(400);
  });
});

describe("입금 문자 접수 API (폰 → 서버)", () => {
  const post = (body: string, headers: Record<string, string> = withSecret()) => ingestPost(req("/api/deposits/ingest", { method: "POST", headers, body, origin: null }));

  it("비밀 키가 맞으면 문자 본문(줄바꿈 포함 text/plain)을 그대로 받아 저장한다", async () => {
    const r = await post(SMS, withSecret({ "content-type": "text/plain" }));
    expect(r.status).toBe(200);
    expect(await data(r)).toMatchObject({ ok: true, saved: true });
    expect(await store.listDeposits()).toHaveLength(1);
  });

  it('JSON({"text": ...})으로도 받고, x-deposit-secret 헤더도 허용한다', async () => {
    const r = await post(JSON.stringify({ text: "농협 입금5,000원\n11/26 19:30\n301-****-4369-51\n김철수" }), { "content-type": "application/json", "x-deposit-secret": SECRET });
    expect(await data(r)).toMatchObject({ saved: true });
    expect((await store.listDeposits())[0]).toMatchObject({ amount: 5000, depositor: "김철수" });
  });

  it("비밀 키가 없거나 틀리면 거부하고 저장하지 않는다", async () => {
    expect((await post(SMS, {})).status).toBe(401);
    expect((await post(SMS, { authorization: "Bearer wrong-secret-value-0000" })).status).toBe(401);
    expect(await store.listDeposits()).toEqual([]);
    expect((await store.getDepositSettings()).lastIngestAt).toBeNull(); // 인증 실패는 수신으로 치지 않는다
  });

  it("비밀 키를 5번 틀리면 잠기고, 그동안은 맞는 키도 받지 않는다", async () => {
    for (let i = 0; i < 5; i++) await post(SMS, { authorization: "Bearer nope" });
    expect((await post(SMS)).status).toBe(429);
  });

  it("서버에 비밀 키가 없거나 너무 짧으면 접수하지 않는다(503)", async () => {
    delete process.env.DEPOSIT_INGEST_SECRET;
    expect((await post(SMS)).status).toBe(503);
    process.env.DEPOSIT_INGEST_SECRET = "short";
    expect((await post(SMS)).status).toBe(503);
    expect(ingestAuth(req("/x", { headers: withSecret() }), { DEPOSIT_INGEST_SECRET: SECRET })).toBe(true);
    expect(ingestAuth(req("/x"), { DEPOSIT_INGEST_SECRET: "short" })).toBeNull();
  });

  it("너무 큰 본문은 거부한다", async () => {
    expect((await post("가".repeat(9000))).status).toBe(413);
    expect(await readSmsText(req("/x", { method: "POST", body: "a".repeat(9000), origin: null }))).toMatchObject({ ok: false });
  });
});

describe("입금 내역·확인·설정 API (포스기·관리자)", () => {
  const as = (cookie: string | null, extra: Record<string, string> = {}) => (cookie ? { cookie, ...extra } : extra);
  const deviceCookie = async () => (await devicePost(req("/api/admin/clock/device", { method: "POST", headers: as(admin) }))).headers.get("set-cookie")!.split(";")[0];

  it("로그인도 등록된 기기도 아니면 볼 수 없다", async () => {
    await ingestDepositSms(store, SMS, NOW);
    const r = await boardGet(req("/api/deposits"));
    expect(r.status).toBe(403);
    expect(await data(r)).toMatchObject({ ok: false, code: "no-device" });
    expect((await boardPatch(req("/api/deposits", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "x", confirmed: true }) }))).status).toBe(403);
  });

  it("관리자 로그인 또는 등록된 매장 기기(포스기)는 보고 확인 처리할 수 있다", async () => {
    await store.insertDeposit({ id: "d1", amount: 1000, depositor: "박성만", occurredAt: new Date().toISOString(), receivedAt: new Date().toISOString(), confirmedAt: null, memo: "" });
    for (const cookie of [admin, await deviceCookie()]) {
      const list = await boardGet(req("/api/deposits?days=1", { headers: as(cookie) }));
      expect(list.status).toBe(200);
      expect((await data(list)).deposits).toHaveLength(1);
    }
    const patch = await boardPatch(req("/api/deposits", { method: "PATCH", headers: as(await deviceCookie(), { "content-type": "application/json" }), body: JSON.stringify({ id: "d1", confirmed: true, memo: "3번" }) }));
    expect(patch.status).toBe(200);
    expect((await store.listDeposits())[0]).toMatchObject({ memo: "3번" });
    expect((await store.listDeposits())[0].confirmedAt).not.toBeNull();
  });

  it("확인 처리는 같은 출처에서 온 요청만 받는다", async () => {
    const r = await boardPatch(req("/api/deposits", { method: "PATCH", headers: as(admin, { "content-type": "application/json" }), body: JSON.stringify({ id: "d1", confirmed: true }), origin: "http://evil.example" }));
    expect(r.status).toBe(403);
  });

  it("제외 이름 설정은 관리자만 보고 바꾸며, 잘못된 값은 거부한다", async () => {
    const json = { "content-type": "application/json" };
    expect((await settingsGet(req("/api/admin/deposits/settings"))).status).toBe(401);
    expect((await settingsPut(req("/api/admin/deposits/settings", { method: "PUT", headers: { ...json, ...as(await deviceCookie()) }, body: JSON.stringify({ excludeNames: ["나이스"] }) }))).status).toBe(401); // 기기는 설정을 못 바꾼다
    expect((await settingsPut(req("/api/admin/deposits/settings", { method: "PUT", headers: { ...json, ...as(admin) }, body: JSON.stringify({ excludeNames: "나이스" }) }))).status).toBe(400);
    const ok = await settingsPut(req("/api/admin/deposits/settings", { method: "PUT", headers: { ...json, ...as(admin) }, body: JSON.stringify({ excludeNames: [" 나이스 ", "나이스", "KIS"] }) }));
    expect(await data(ok)).toMatchObject({ ok: true, excludeNames: ["나이스", "KIS"] });
    expect(await data(await settingsGet(req("/api/admin/deposits/settings", { headers: as(admin) })))).toMatchObject({ excludeNames: ["나이스", "KIS"] });
    expect((await settingsPut(req("/api/admin/deposits/settings", { method: "PUT", headers: { ...json, ...as(admin) }, body: JSON.stringify({ excludeNames: ["나이스"] }), origin: "http://evil.example" }))).status).toBe(403);
  });
});
