import { beforeEach, describe, expect, it } from "vitest";
import { buildConfig } from "@/lib/contract";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { addEvent, adminEmployees, createDeviceToken, DEVICE_COOKIE, editEvent, hashPin, isClockDevice, pinMatches, punch, recentEvents, removeEvent, roster, setPin, sheetData, verifyDeviceToken } from "@/lib/contract/server/clock";
import { createSessionToken, verifySessionToken } from "@/lib/contract/server/auth";
import { setStoreForTests } from "@/lib/contract/server/select";
import type { ContractStore, SubmissionRecord } from "@/lib/contract/server/store";
import { POST as login } from "@/app/api/admin/login/route";
import { DELETE as deviceDelete, GET as deviceGet, POST as devicePost } from "@/app/api/admin/clock/device/route";
import { GET as empGet } from "@/app/api/admin/clock/employees/route";
import { DELETE as pinDelete, PUT as pinPut } from "@/app/api/admin/clock/employees/[id]/pin/route";
import { GET as sheetGet } from "@/app/api/admin/clock/sheet/route";
import { POST as eventPost } from "@/app/api/admin/clock/events/route";
import { DELETE as eventDelete, PATCH as eventPatch } from "@/app/api/admin/clock/events/[eid]/route";
import { GET as rosterGet } from "@/app/api/clock/roster/route";
import { POST as punchPost } from "@/app/api/clock/punch/route";

const ORIGIN = "http://localhost:4100";
const PASSWORD = "correct-horse-battery";
const SECRET = "s".repeat(40);
const PNG = "data:image/png;base64," + "iVBORw0KGgo".repeat(30);

const req = (p: string, o: { method?: string; body?: unknown; cookie?: string; origin?: string | null } = {}) => {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (o.origin !== null) headers.origin = o.origin ?? ORIGIN;
  if (o.cookie) headers.cookie = o.cookie;
  return new Request(ORIGIN + p, { method: o.method ?? "GET", headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
};
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const data = async (r: Response) => (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const sub = (id: string, name: string, confirmed = true): SubmissionRecord => ({
  id,
  configToken: "tok-" + id,
  configSnapshot: buildConfig(null, { type: "hourly", wage: "12000", label: "" }),
  name,
  phone: "010-1234-5678",
  address: "경기 파주시 광탄면 만장산로 1",
  sig: PNG,
  signedAt: "2026-11-14T09:00:00.000Z",
  insForm: null,
  ownerSig: confirmed ? PNG : null,
  countersignedAt: confirmed ? "2026-11-14T10:00:00.000Z" : null,
  editedAt: null,
});

let store: ContractStore;
beforeEach(() => {
  store = createMemoryStore();
  setStoreForTests(store);
  process.env.CONTRACT_ADMIN_PASSWORD = PASSWORD;
  process.env.CONTRACT_SESSION_SECRET = SECRET;
  delete process.env.DATABASE_URL;
});

async function adminCookie(): Promise<string> {
  const res = await login(req("/api/admin/login", { method: "POST", body: { password: PASSWORD } }));
  return res.headers.get("set-cookie")!.split(";")[0];
}
async function deviceCookieValue(admin: string): Promise<string> {
  const res = await devicePost(req("/api/admin/clock/device", { method: "POST", cookie: admin }));
  expect(res.status).toBe(200);
  return res.headers.get("set-cookie")!.split(";")[0];
}

describe("출퇴근 PIN·기기 토큰", () => {
  it("PIN은 해시로만 저장되고 맞는 값만 통과한다", () => {
    const rec = hashPin("1234");
    expect(rec.hash).not.toContain("1234");
    expect(pinMatches("1234", rec)).toBe(true);
    expect(pinMatches("1235", rec)).toBe(false);
    expect(hashPin("1234").salt).not.toBe(rec.salt); // 같은 PIN도 salt가 달라 해시가 다르다
  });

  it("기기 토큰과 관리자 세션 토큰은 서로 통하지 않는다", () => {
    const device = createDeviceToken(SECRET);
    const admin = createSessionToken(SECRET);
    expect(verifyDeviceToken(device, SECRET)).toBe(true);
    expect(verifySessionToken(device, SECRET)).toBe(false); // 기기 토큰으로 관리자 화면에 못 들어간다
    expect(verifyDeviceToken(admin, SECRET)).toBe(false); // 관리자 토큰은 출퇴근 기기로 인정되지 않는다
    expect(verifyDeviceToken(device, "x".repeat(40))).toBe(false);
    expect(verifyDeviceToken(device + "x", SECRET)).toBe(false);
    expect(verifyDeviceToken(createDeviceToken(SECRET, Date.now() - 181 * 24 * 3600 * 1000), SECRET)).toBe(false); // 만료
  });
});

describe("기기 등록·접근 제한 (API)", () => {
  it("관리자만 기기를 등록·해제하고, 등록된 기기에서만 직원 목록이 보인다", async () => {
    expect((await devicePost(req("/x", { method: "POST" }))).status).toBe(401);
    expect((await deviceGet(req("/x"))).status).toBe(401);
    expect((await empGet(req("/x"))).status).toBe(401);

    const admin = await adminCookie();
    expect((await devicePost(req("/x", { method: "POST", cookie: admin, origin: "http://evil.example" }))).status).toBe(403); // 같은 출처만
    expect((await data(await deviceGet(req("/x", { cookie: admin })))).registered).toBe(false);

    const res = await devicePost(req("/x", { method: "POST", cookie: admin }));
    expect(res.headers.get("set-cookie")).toMatch(new RegExp(`^${DEVICE_COOKIE}=.+; Path=/; HttpOnly; SameSite=Lax; Max-Age=\\d+`));
    const device = res.headers.get("set-cookie")!.split(";")[0];
    expect(isClockDevice(req("/x", { cookie: device }))).toBe(true);
    expect(isClockDevice(req("/x", { cookie: admin }))).toBe(false);

    // 기기 쿠키만 있으면 직원 목록은 되지만 관리자 API는 안 된다.
    expect((await rosterGet(req("/x", { cookie: device }))).status).toBe(200);
    expect((await empGet(req("/x", { cookie: device }))).status).toBe(401);
    // 등록되지 않은 브라우저(쿠키 없음)와 관리자 쿠키만 있는 브라우저는 직원 목록을 못 본다.
    const noDevice = await rosterGet(req("/x"));
    expect(noDevice.status).toBe(403);
    expect(await data(noDevice)).toMatchObject({ ok: false, code: "no-device" });
    expect((await rosterGet(req("/x", { cookie: admin }))).status).toBe(403);
    expect((await punchPost(req("/x", { method: "POST", body: {} }))).status).toBe(403);

    const out = await deviceDelete(req("/x", { method: "DELETE", cookie: admin }));
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("직원 목록과 PIN 발급", () => {
  it("사업주 서명이 끝난 직원만 대상이고, PIN을 만들어야 기기 목록에 나온다", async () => {
    await store.insertSubmission(sub("a", "홍길동"));
    await store.insertSubmission(sub("b", "김철수", false)); // 사업주 서명 대기
    expect((await adminEmployees(store)).map((e) => [e.name, e.hasPin])).toEqual([["홍길동", false]]);
    expect(await roster(store)).toEqual([]);

    expect((await setPin(store, "b", "1234")).status).toBe(404); // 확정 전에는 PIN을 만들 수 없다
    expect((await setPin(store, "a", "12")).status).toBe(400);
    expect((await setPin(store, "a", "1234")).status).toBe(200);
    expect(await roster(store)).toEqual([{ id: "a", name: "홍길동", status: "out", stale: false }]);
  });

  it("자동 발급은 4자리 숫자를 한 번만 돌려주고, 저장된 PIN으로 출퇴근이 된다", async () => {
    await store.insertSubmission(sub("a", "홍길동"));
    const r = await setPin(store, "a", null);
    const pin = r.body.pin as string;
    expect(pin).toMatch(/^\d{4}$/);
    expect((await punch(store, { id: "a", pin, kind: "in" })).status).toBe(201);
  });

  it("관리자 API: PIN 설정·삭제(기존 기록은 유지)", async () => {
    const admin = await adminCookie();
    await store.insertSubmission(sub("a", "홍길동"));
    expect((await pinPut(req("/x", { method: "PUT", body: { pin: "1234" } }), ctx("a"))).status).toBe(401);
    expect((await pinPut(req("/x", { method: "PUT", cookie: admin, body: { pin: "12a4" } }), ctx("a"))).status).toBe(400);
    expect((await pinPut(req("/x", { method: "PUT", cookie: admin, body: { pin: "1234" } }), ctx("a"))).status).toBe(200);
    const gen = await data(await pinPut(req("/x", { method: "PUT", cookie: admin, body: { generate: true } }), ctx("a")));
    expect(gen.pin).toMatch(/^\d{4}$/);
    await punch(store, { id: "a", pin: gen.pin, kind: "in" });

    const list = await data(await empGet(req("/x", { cookie: admin })));
    expect(list.employees[0]).toMatchObject({ id: "a", hasPin: true, status: "in" });
    expect(JSON.stringify(list)).not.toContain(gen.pin); // 조회 응답에는 PIN도 해시도 들어 있지 않다
    expect(JSON.stringify(list)).not.toMatch(/"hash"|"salt"/);

    expect(await data(await pinDelete(req("/x", { method: "DELETE", cookie: admin }), ctx("a")))).toMatchObject({ ok: true, deleted: true });
    expect(await roster(store)).toEqual([]);
    expect(await store.listClockEvents({ submissionId: "a" })).toHaveLength(1); // 기록은 남는다
  });
});

describe("출근·퇴근 기록", () => {
  const T0 = new Date("2026-11-15T00:00:00.000Z");
  const at = (sec: number) => new Date(T0.getTime() + sec * 1000);

  beforeEach(async () => {
    await store.insertSubmission(sub("a", "홍길동"));
    await setPin(store, "a", "1234");
  });

  it("출근 → 퇴근 → 출근 순서로 서버 시각에 기록된다", async () => {
    const r1 = await punch(store, { id: "a", pin: "1234", kind: "in", at: "2000-01-01T00:00:00Z" }, at(0));
    expect(r1.status).toBe(201);
    expect(r1.body).toMatchObject({ ok: true, kind: "in", at: T0.toISOString(), name: "홍길동" }); // 클라이언트가 보낸 시각은 무시
    expect((await roster(store))[0].status).toBe("in");
    expect((await punch(store, { id: "a", pin: "1234", kind: "out" }, at(3600))).status).toBe(201);
    expect((await roster(store))[0].status).toBe("out");
    expect((await punch(store, { id: "a", pin: "1234", kind: "in" }, at(7200))).status).toBe(201);
    expect((await store.listClockEvents({ submissionId: "a" })).map((e) => e.kind)).toEqual(["in", "out", "in"]);
  });

  it("같은 동작을 연달아 누르거나 상태에 맞지 않는 동작은 거부한다", async () => {
    await punch(store, { id: "a", pin: "1234", kind: "in" }, at(0));
    const dup = await punch(store, { id: "a", pin: "1234", kind: "in" }, at(5));
    expect(dup).toMatchObject({ status: 409, body: { code: "duplicate" } }); // 30초 안에 또 눌렀다
    const state = await punch(store, { id: "a", pin: "1234", kind: "in" }, at(600));
    expect(state).toMatchObject({ status: 409, body: { code: "state", status: "in" } }); // 이미 출근 상태
    expect(await store.listClockEvents({ submissionId: "a" })).toHaveLength(1);
  });

  it("중복 안내 문구에는 다시 누를 수 있는 남은 초가 들어간다", async () => {
    await punch(store, { id: "a", pin: "1234", kind: "in" }, at(0));
    const r = await punch(store, { id: "a", pin: "1234", kind: "out" }, at(5));
    expect(r.body.error).toBe("방금 기록되었습니다. 25초 뒤에 다시 누를 수 있습니다.");
    expect((await punch(store, { id: "a", pin: "1234", kind: "out" }, at(29.5 * 1))).body.error).toContain("1초");
    expect((await punch(store, { id: "a", pin: "1234", kind: "out" }, at(31))).status).toBe(201); // 30초가 지나면 기록된다
  });

  it("퇴근을 깜빡한 다음 날 출근은 퇴근으로 잘못 기록되지 않고 새 출근으로 받는다", async () => {
    await punch(store, { id: "a", pin: "1234", kind: "in" }, at(0)); // 어제 출근, 퇴근을 안 찍음
    const H = 3600;
    expect((await roster(store, at(15 * H)))[0]).toMatchObject({ status: "in", stale: false }); // 15시간 뒤에도 근무 중으로 본다
    const next = at(26 * H); // 다음 날 아침
    expect((await roster(store, next))[0]).toMatchObject({ status: "out", stale: true });
    expect((await adminEmployees(store, next))[0]).toMatchObject({ status: "out", stale: true });

    // 퇴근 버튼(옛 화면)을 누르면 거부되고, 퇴근 기록이 없음을 안내한다.
    const wrong = await punch(store, { id: "a", pin: "1234", kind: "out" }, next);
    expect(wrong).toMatchObject({ status: 409, body: { code: "stale", status: "out" } });
    expect(String(wrong.body.error)).toContain("전 근무의 퇴근 기록이 없습니다");
    expect(await store.listClockEvents({ submissionId: "a" })).toHaveLength(1);

    // 출근은 새 출근으로 기록된다. 전 근무는 퇴근 기록 없이 그대로 남아 월간 기록부에서 정정할 수 있다.
    expect((await punch(store, { id: "a", pin: "1234", kind: "in" }, next)).status).toBe(201);
    expect((await store.listClockEvents({ submissionId: "a" })).map((e) => e.kind)).toEqual(["in", "in"]);
    expect((await roster(store, at(27 * H)))[0]).toMatchObject({ status: "in", stale: false });
    expect((await punch(store, { id: "a", pin: "1234", kind: "out" }, at(35 * H))).status).toBe(201); // 이후 퇴근은 정상
  });

  it("PIN이 틀리면 기록되지 않고, 5번 틀리면 10분간 잠기며, 새 PIN을 만들면 풀린다", async () => {
    for (let i = 1; i <= 4; i++) {
      const r = await punch(store, { id: "a", pin: "0000", kind: "in" }, at(i));
      expect(r.status).toBe(401);
    }
    expect((await punch(store, { id: "a", pin: "0000", kind: "in" }, at(5))).status).toBe(401);
    const locked = await punch(store, { id: "a", pin: "1234", kind: "in" }, at(6)); // 맞는 PIN도 잠금 중에는 거부
    expect(locked.status).toBe(429);
    expect(await store.listClockEvents()).toHaveLength(0);

    expect((await punch(store, { id: "a", pin: "1234", kind: "in" }, at(10 * 60 + 10))).status).toBe(201); // 10분 뒤
    await setPin(store, "a", "5678");
    expect((await punch(store, { id: "a", pin: "0000", kind: "out" }, at(3 * 3600))).status).toBe(401); // 잠금 카운트가 새로 시작
  });

  it("잘못된 입력·없는 직원·확정되지 않은 직원·PIN이 없는 직원은 같은 방식으로 거절한다", async () => {
    expect((await punch(store, null)).status).toBe(400);
    expect((await punch(store, { id: "a", pin: "12", kind: "in" })).status).toBe(400);
    expect((await punch(store, { id: "a", pin: "1234", kind: "later" })).status).toBe(400);
    expect((await punch(store, { id: "zzz", pin: "1234", kind: "in" })).status).toBe(404);
    await store.insertSubmission(sub("c", "박지성", false));
    await store.putClockPin({ submissionId: "c", ...hashPin("1234"), updatedAt: "2026-11-15T00:00:00.000Z" });
    expect((await punch(store, { id: "c", pin: "1234", kind: "in" })).status).toBe(404); // 사업주 서명 전
    await store.insertSubmission(sub("d", "이영희"));
    expect((await punch(store, { id: "d", pin: "1234", kind: "in" })).status).toBe(404); // PIN 없음
  });

  it("최근 기록은 최신순이고 직원 이름이 붙는다", async () => {
    await punch(store, { id: "a", pin: "1234", kind: "in" }, at(0));
    await punch(store, { id: "a", pin: "1234", kind: "out" }, at(3600));
    const ev = await recentEvents(store, 7, at(7200));
    expect(ev.map((e) => [e.name, e.kind])).toEqual([["홍길동", "out"], ["홍길동", "in"]]);
    expect(await recentEvents(store, 7, new Date(T0.getTime() + 30 * 24 * 3600 * 1000))).toEqual([]); // 7일 지난 기록은 제외
  });

  it("API: 등록된 기기에서 PIN으로 출근을 기록한다", async () => {
    const admin = await adminCookie();
    const device = await deviceCookieValue(admin);
    const ok = await punchPost(req("/x", { method: "POST", cookie: device, body: { id: "a", pin: "1234", kind: "in" } }));
    expect(ok.status).toBe(201);
    expect(await data(ok)).toMatchObject({ ok: true, kind: "in", name: "홍길동" });
    expect((await punchPost(req("/x", { method: "POST", cookie: device, origin: "http://evil.example", body: { id: "a", pin: "1234", kind: "out" } }))).status).toBe(403);
    expect((await punchPost(req("/x", { method: "POST", cookie: device, body: { id: "a", pin: "9999", kind: "out" } }))).status).toBe(401);
  });
});

describe("월간 기록부 데이터와 관리자 정정", () => {
  const NOW = new Date("2026-11-20T03:00:00.000Z");
  const T = (local: string) => new Date(`${local}:00+09:00`).toISOString();

  beforeEach(async () => {
    await store.insertSubmission(sub("a", "홍길동"));
    await store.insertSubmission(sub("b", "김철수", false));
  });

  it("월간 기록부 데이터: 확정된 직원만, 달 형식 검증, 계약 정보와 이 달 기록·이력을 돌려준다", async () => {
    expect((await sheetData(store, "a", "2026-13")).status).toBe(400);
    expect((await sheetData(store, "b", "2026-11")).status).toBe(404); // 사업주 서명 대기
    expect((await sheetData(store, "zzz", "2026-11")).status).toBe(404);
    await addEvent(store, { submissionId: "a", kind: "in", at: "2026-11-02T10:00", reason: "시험" }, NOW);
    await addEvent(store, { submissionId: "a", kind: "in", at: "2026-09-02T10:00", reason: "먼 달" }, NOW);
    const r = await sheetData(store, "a", "2026-11");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, month: "2026-11", employee: { id: "a", name: "홍길동" }, biz: "사색찬미한정식" });
    expect((r.body.events as unknown[]).length).toBe(1); // 9월 기록은 조회 기간 밖
    expect(JSON.stringify(r.body)).not.toMatch(/"sig"|"phone"|"address"|ownerSig/); // 서명·연락처·주소는 내보내지 않는다
  });

  it("기록 추가: 사유·형식·미래 시각·대상 직원을 검증하고 이력을 남긴다", async () => {
    const ok = { submissionId: "a", kind: "in", at: "2026-11-02T10:00", reason: "인터넷이 끊겨 기록하지 못함" };
    expect((await addEvent(store, { ...ok, reason: "  " }, NOW)).status).toBe(400);
    expect((await addEvent(store, { ...ok, kind: "x" }, NOW)).status).toBe(400);
    expect((await addEvent(store, { ...ok, at: "2026-02-30T10:00" }, NOW)).status).toBe(400);
    expect((await addEvent(store, { ...ok, at: "2026-11-21T10:00" }, NOW)).status).toBe(400); // 미래
    expect((await addEvent(store, { ...ok, submissionId: "b" }, NOW)).status).toBe(404);
    expect((await store.listClockEvents()).length).toBe(0);

    const r = await addEvent(store, ok, NOW);
    expect(r.status).toBe(201);
    const ev = await store.listClockEvents({ submissionId: "a" });
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ kind: "in", at: T("2026-11-02T10:00"), source: "admin", note: ok.reason });
    expect(await store.listClockAudit()).toMatchObject([{ action: "add", before: null, after: { kind: "in", at: T("2026-11-02T10:00") }, reason: ok.reason, at: NOW.toISOString() }]);
  });

  it("기록 수정: 사유 필수, 정정 전 내용이 이력에 남고 기록은 관리자 입력으로 바뀐다", async () => {
    await punch(store, { id: "a", pin: "1234", kind: "in" }, new Date("2026-11-02T01:00:00.000Z")).catch(() => null);
    await setPin(store, "a", "1234");
    await punch(store, { id: "a", pin: "1234", kind: "in" }, new Date("2026-11-02T01:00:00.000Z"));
    const [orig] = await store.listClockEvents({ submissionId: "a" });
    expect((await editEvent(store, orig.id, { at: "2026-11-02T09:30" }, NOW)).status).toBe(400); // 사유 없음
    expect((await editEvent(store, orig.id, { reason: "x" }, NOW)).status).toBe(400); // 바꿀 내용 없음
    expect((await editEvent(store, orig.id, { at: "bad", reason: "x" }, NOW)).status).toBe(400);
    expect((await editEvent(store, "nope", { at: "2026-11-02T09:30", reason: "x" }, NOW)).status).toBe(404);

    const r = await editEvent(store, orig.id, { at: "2026-11-02T09:30", reason: "10시에 찍었지만 실제 출근은 9시 반" }, NOW);
    expect(r.status).toBe(200);
    expect(await store.getClockEvent(orig.id)).toMatchObject({ at: T("2026-11-02T09:30"), source: "admin", note: "10시에 찍었지만 실제 출근은 9시 반", kind: "in" });
    const audit = await store.listClockAudit({ submissionId: "a" });
    expect(audit[0]).toMatchObject({ action: "edit", before: { kind: "in", at: orig.at }, after: { kind: "in", at: T("2026-11-02T09:30") } });
  });

  it("기록 삭제: 사유 필수, 삭제 후에도 이력에 원래 내용이 남는다", async () => {
    const add = await addEvent(store, { submissionId: "a", kind: "out", at: "2026-11-02T18:00", reason: "추가" }, NOW);
    const id = (add.body.event as { id: string }).id;
    expect((await removeEvent(store, id, {}, NOW)).status).toBe(400);
    expect((await removeEvent(store, "nope", { reason: "x" }, NOW)).status).toBe(404);
    expect((await removeEvent(store, id, { reason: "잘못 입력" }, new Date(NOW.getTime() + 1000))).status).toBe(200);
    expect(await store.getClockEvent(id)).toBeNull();
    const audit = await store.listClockAudit();
    expect(audit.map((a) => a.action)).toEqual(["add", "delete"]);
    expect(audit[1]).toMatchObject({ before: { kind: "out", at: T("2026-11-02T18:00") }, after: null, reason: "잘못 입력" });
  });

  it("API: 관리자만 정정할 수 있고 같은 출처 요청만 받는다", async () => {
    const admin = await adminCookie();
    const device = await deviceCookieValue(admin);
    const body = { submissionId: "a", kind: "in", at: "2026-11-02T10:00", reason: "시험" };
    expect((await eventPost(req("/x", { method: "POST", body }))).status).toBe(401);
    expect((await eventPost(req("/x", { method: "POST", cookie: device, body }))).status).toBe(401); // 기기 쿠키로는 정정 불가
    expect((await eventPost(req("/x", { method: "POST", cookie: admin, origin: "http://evil.example", body }))).status).toBe(403);
    const ok = await eventPost(req("/x", { method: "POST", cookie: admin, body }));
    expect(ok.status).toBe(201);
    const id = (await data(ok)).event.id as string;
    expect((await eventPatch(req("/x", { method: "PATCH", body: { at: "2026-11-02T11:00", reason: "x" } }), { params: Promise.resolve({ eid: id }) })).status).toBe(401);
    expect((await eventPatch(req("/x", { method: "PATCH", cookie: admin, body: { at: "2026-11-02T11:00", reason: "수정" } }), { params: Promise.resolve({ eid: id }) })).status).toBe(200);
    expect((await sheetGet(req("/x?id=a&month=2026-11"))).status).toBe(401);
    const sheet = await data(await sheetGet(req("/x?id=a&month=2026-11", { cookie: admin })));
    expect(sheet.events).toHaveLength(1);
    expect(sheet.audit.map((a: { action: string }) => a.action)).toEqual(["add", "edit"]);
    expect((await eventDelete(req("/x", { method: "DELETE", cookie: admin, body: {} }), { params: Promise.resolve({ eid: id }) })).status).toBe(400);
    expect((await eventDelete(req("/x", { method: "DELETE", cookie: admin, body: { reason: "정리" } }), { params: Promise.resolve({ eid: id }) })).status).toBe(200);
  });
});
