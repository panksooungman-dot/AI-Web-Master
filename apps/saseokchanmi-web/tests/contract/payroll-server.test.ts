import { beforeEach, describe, expect, it } from "vitest";
import { buildConfig } from "@/lib/contract";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { addEvent } from "@/lib/contract/server/clock";
import { confirmPayslip, defaultPayDate, parsePayrollInput, parsePayrollSettings, payrollEmployee, payrollOverview, defaultPayrollSettings } from "@/lib/contract/server/payroll";
import { setStoreForTests } from "@/lib/contract/server/select";
import type { ContractStore, SubmissionRecord } from "@/lib/contract/server/store";
import { POST as login } from "@/app/api/admin/login/route";
import { GET as settingsGet, PUT as settingsPut } from "@/app/api/admin/payroll/settings/route";
import { GET as overviewGet } from "@/app/api/admin/payroll/overview/route";
import { GET as employeeGet } from "@/app/api/admin/payroll/employee/route";
import { POST as confirmPost } from "@/app/api/admin/payroll/confirm/route";

const ORIGIN = "http://localhost:4100";
const PNG = "data:image/png;base64," + "iVBORw0KGgo".repeat(30);
const NOW = new Date("2026-11-20T03:00:00.000Z");
const sub = (id: string, name: string, confirmed = true): SubmissionRecord => ({
  id,
  configToken: "tok-" + id,
  configSnapshot: buildConfig(null, { type: "hourly", wage: "10000", holiday: "none", payDay: "10", label: "" }),
  name,
  phone: "010-1234-5678",
  address: "경기 파주시 광탄면 만장산로 1",
  sig: PNG,
  signedAt: "2026-10-01T09:00:00.000Z",
  insForm: null,
  ownerSig: confirmed ? PNG : null,
  countersignedAt: confirmed ? "2026-10-01T10:00:00.000Z" : null,
  editedAt: null,
});

let store: ContractStore;
let cookie = "";
const req = (path: string, o: { method?: string; body?: unknown; cookie?: string | null; origin?: string | null } = {}) => {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (o.origin !== null) headers.origin = o.origin ?? ORIGIN;
  const c = o.cookie === undefined ? cookie : o.cookie;
  if (c) headers.cookie = c;
  return new Request(ORIGIN + path, { method: o.method ?? "GET", headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
};
const data = async (r: Response) => (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const shift = async (id: string, date: string, a = "10:00", b = "14:00") => {
  await addEvent(store, { submissionId: id, kind: "in", at: `${date}T${a}`, reason: "시험" }, NOW);
  await addEvent(store, { submissionId: id, kind: "out", at: `${date}T${b}`, reason: "시험" }, NOW);
};

beforeEach(async () => {
  store = createMemoryStore();
  setStoreForTests(store);
  process.env.CONTRACT_ADMIN_PASSWORD = "correct-horse-battery";
  process.env.CONTRACT_SESSION_SECRET = "s".repeat(40);
  delete process.env.DATABASE_URL;
  const res = await login(req("/api/admin/login", { method: "POST", body: { password: "correct-horse-battery" }, cookie: null }));
  cookie = res.headers.get("set-cookie")!.split(";")[0];
  // 기본 계약에는 공통 휴게시간(1시간)이 있어 자동 차감하면 시간이 달라지므로, 시험은 차감하지 않는 설정으로 한다.
  await store.putPayrollSettings({ ...defaultPayrollSettings(), deductBreak: false, updatedAt: NOW.toISOString() });
  await store.insertSubmission(sub("a", "홍길동"));
  await store.insertSubmission(sub("b", "김철수", false)); // 사업주 서명 대기
  await store.insertSubmission(sub("c", "이영희"));
  for (let d = 5; d <= 9; d++) await shift("a", `2026-10-0${d}`); // 5일 × 4시간 = 20시간 → 200,000원
});

describe("급여 설정", () => {
  it("검증: 공제율은 0~100 숫자만, 보낸 항목만 바꾼다", () => {
    const cur = defaultPayrollSettings();
    expect(parsePayrollSettings({ rates: { pension: -1 } }, cur)).toMatchObject({ ok: false });
    expect(parsePayrollSettings({ rates: { pension: "4.5" } }, cur)).toMatchObject({ ok: false });
    expect(parsePayrollSettings({ deductBreak: "yes" }, cur)).toMatchObject({ ok: false });
    const ok = parsePayrollSettings({ rates: { pension: 4.5, health: 3.5456 } }, cur);
    expect(ok).toMatchObject({ ok: true, value: { deductBreak: true, rates: { pension: 4.5, health: 3.546, ltc: 0, employment: 0, localTax: 10 } } });
  });

  it("API: 로그인·같은 출처 필요, 저장한 값을 다시 읽는다", async () => {
    expect((await settingsGet(req("/api/admin/payroll/settings", { cookie: null }))).status).toBe(401);
    expect((await settingsPut(req("/api/admin/payroll/settings", { method: "PUT", body: { rates: { pension: 4.5 } }, origin: "http://evil.example" }))).status).toBe(403);
    expect((await settingsPut(req("/api/admin/payroll/settings", { method: "PUT", body: { rates: { pension: 120 } } }))).status).toBe(400);
    const put = await settingsPut(req("/api/admin/payroll/settings", { method: "PUT", body: { rates: { pension: 4.5, employment: 0.9 }, deductBreak: false } }));
    expect(put.status).toBe(200);
    expect(await data(await settingsGet(req("/api/admin/payroll/settings")))).toMatchObject({ ok: true, deductBreak: false, rates: { pension: 4.5, employment: 0.9, health: 0, localTax: 10 } });
    const on = await settingsPut(req("/api/admin/payroll/settings", { method: "PUT", body: { deductBreak: true } }));
    expect(await data(on)).toMatchObject({ deductBreak: true, rates: { pension: 4.5 } }); // 보낸 항목만 바뀐다
  });
});

describe("명세서 입력 검증", () => {
  it("금액은 0 이상의 정수, 개수·날짜 형식 제한, 모르는 항목은 버린다", () => {
    expect(parsePayrollInput({ extraEarnings: [{ label: "식대", amount: -1 }] })).toMatchObject({ ok: false });
    expect(parsePayrollInput({ extraEarnings: [{ label: "x", amount: 1.5 }] })).toMatchObject({ ok: false });
    expect(parsePayrollInput({ extraDeductions: Array.from({ length: 11 }, () => ({ label: "x", amount: 1 })) })).toMatchObject({ ok: false });
    expect(parsePayrollInput({ override: { health: -5 } })).toMatchObject({ ok: false });
    expect(parsePayrollInput({ payDate: "2026-02-30" })).toMatchObject({ ok: false });
    const ok = parsePayrollInput({ payDate: "2026-11-10", extraEarnings: [{ label: " 식대 ", amount: 5000 }, { label: "빈", amount: 0 }], override: { incomeTax: 1000, bogus: 5 }, ack: true, foo: 1 });
    expect(ok).toEqual({ ok: true, value: { payDate: "2026-11-10", extraEarnings: [{ label: "식대", amount: 5000 }], extraDeductions: [], override: { incomeTax: 1000 }, ack: true } });
  });

  it("기본 지급일: 계약서 급여일의 다음 달", () => {
    expect(defaultPayDate("2026-10", "10")).toBe("2026-11-10");
    expect(defaultPayDate("2026-12", "5")).toBe("2027-01-05");
    expect(defaultPayDate("2026-10", "")).toBe("");
    expect(defaultPayDate("2026-10", "31")).toBe("");
  });
});

describe("직원·전체 현황 데이터", () => {
  it("직원 데이터: 확정 직원만, 계산에 필요한 계약 항목과 기록만 내보낸다", async () => {
    expect((await payrollEmployee(store, "a", "2026-13")).status).toBe(400);
    expect((await payrollEmployee(store, "b", "2026-10")).status).toBe(404);
    const r = await payrollEmployee(store, "a", "2026-10");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, employee: { id: "a", name: "홍길동" }, biz: "사색찬미한정식", defaultPayDate: "2026-11-10", payslip: null });
    expect((r.body.events as unknown[]).length).toBe(10);
    expect(JSON.stringify(r.body)).not.toMatch(/"sig"|"phone"|"address"|ownerSig/);
  });

  it("전체 현황: 확정 직원 모두, 기록이 없으면 0원 예상, 확정하면 확정 금액으로 바뀐다", async () => {
    const o = await payrollOverview(store, "2026-10");
    const rows = o.body.rows as { id: string; status: string; gross: number }[];
    expect(rows.map((x) => [x.id, x.status, x.gross])).toEqual([["c", "draft", 0], ["a", "draft", 200000]]); // 김철수는 확정 전 계약이라 제외
    await confirmPayslip(store, { id: "a", month: "2026-10", input: { payDate: "2026-11-10" } }, NOW);
    const after = (await payrollOverview(store, "2026-10")).body.rows as { id: string; status: string; revision: number }[];
    expect(after.find((x) => x.id === "a")).toMatchObject({ status: "confirmed", revision: 1 });
  });
});

describe("급여 확정", () => {
  const post = (body: unknown, o: Parameters<typeof req>[1] = {}) => confirmPost(req("/api/admin/payroll/confirm", { method: "POST", body, ...o }));

  it("지급일이 없거나 미래 달이거나 확정 전 직원이면 거부한다", async () => {
    expect((await confirmPayslip(store, { id: "a", month: "2026-10", input: {} }, NOW)).status).toBe(400);
    expect((await confirmPayslip(store, { id: "a", month: "2026-12", input: { payDate: "2027-01-10" } }, NOW)).status).toBe(400);
    expect((await confirmPayslip(store, { id: "b", month: "2026-10", input: { payDate: "2026-11-10" } }, NOW)).status).toBe(404);
    expect((await confirmPayslip(store, { id: "a", month: "2026-10", input: { payDate: "2026-11-10", extraDeductions: [{ label: "가불", amount: 999999 }] } }, NOW)).status).toBe(400);
    expect(await store.listPayslips()).toEqual([]);
  });

  it("서버가 다시 계산해서 저장한다(클라이언트가 보낸 금액은 무시)", async () => {
    const r = await confirmPayslip(store, { id: "a", month: "2026-10", gross: 99999999, statement: { gross: 1 }, input: { payDate: "2026-11-10", extraEarnings: [{ label: "식대", amount: 30000 }] } }, NOW);
    expect(r.status).toBe(201);
    const rec = r.body.payslip as { statement: { gross: number; net: number }; revision: number; employeeName: string; employeeNo: string; payDate: string };
    expect(rec).toMatchObject({ revision: 1, employeeName: "홍길동", payDate: "2026-11-10", statement: { gross: 230000, net: 230000 } });
    expect(rec.employeeNo).toContain("관리번호");
    expect(await store.getPayslip("a", "2026-10")).toMatchObject({ statement: { gross: 230000 } });
  });

  it("이미 확정된 뒤 출퇴근 기록을 고쳐도 확정 금액은 바뀌지 않고, 다시 확정하면 차수가 올라가며 이전 금액이 남는다", async () => {
    await confirmPayslip(store, { id: "a", month: "2026-10", input: { payDate: "2026-11-10" } }, NOW);
    await shift("a", "2026-10-12"); // 4시간 추가
    expect((await store.getPayslip("a", "2026-10"))?.statement.gross).toBe(200000);
    const r = await confirmPayslip(store, { id: "a", month: "2026-10", input: { payDate: "2026-11-12" } }, new Date("2026-11-21T03:00:00.000Z"));
    expect(r.status).toBe(200);
    expect(r.body.payslip).toMatchObject({ revision: 2, payDate: "2026-11-12", statement: { gross: 240000 }, history: [{ revision: 1, gross: 200000, net: 200000 }] });
    expect((await store.listPayslips({ month: "2026-10" })).length).toBe(1);
  });

  it("퇴근 기록이 빠진 달은 확인(ack) 없이는 409, 확인하면 확정된다", async () => {
    await addEvent(store, { submissionId: "c", kind: "in", at: "2026-10-20T10:00", reason: "시험" }, NOW);
    const blocked = await confirmPayslip(store, { id: "c", month: "2026-10", input: { payDate: "2026-11-10" } }, NOW);
    expect(blocked.status).toBe(409);
    expect(blocked.body).toMatchObject({ code: "needs_ack" });
    expect(String((blocked.body.blocking as string[])[0])).toContain("퇴근 기록이 없는");
    expect(await store.listPayslips()).toEqual([]);
    expect((await confirmPayslip(store, { id: "c", month: "2026-10", input: { payDate: "2026-11-10", ack: true } }, NOW)).status).toBe(201);
  });

  it("설정한 공제율이 적용되어 저장된다", async () => {
    await store.putPayrollSettings({ rates: { pension: 4.5, health: 0, ltc: 0, employment: 1, localTax: 10 }, deductBreak: false, updatedAt: NOW.toISOString() });
    const r = await confirmPayslip(store, { id: "a", month: "2026-10", input: { payDate: "2026-11-10", override: { incomeTax: 3000 } } }, NOW);
    const s = (r.body.payslip as { statement: { deductions: { key: string; amount: number }[]; deductionTotal: number; net: number } }).statement;
    expect(Object.fromEntries(s.deductions.map((d) => [d.key, d.amount]))).toEqual({ pension: 9000, employment: 2000, incomeTax: 3000, localTax: 300 });
    expect(s.net).toBe(200000 - 14300);
  });

  it("API: 로그인·같은 출처가 없으면 거부하고, 있으면 저장한다", async () => {
    const body = { id: "a", month: "2026-10", input: { payDate: "2026-11-10" } };
    expect((await post(body, { cookie: null })).status).toBe(401);
    expect((await post(body, { origin: "http://evil.example" })).status).toBe(403);
    const ok = await post(body);
    expect([200, 201]).toContain(ok.status); // 시험 시계가 아니라 실제 시계 기준이므로 2026-10은 과거 달
    expect((await employeeGet(req("/api/admin/payroll/employee?id=a&month=2026-10"))).status).toBe(200);
    expect((await data(await employeeGet(req("/api/admin/payroll/employee?id=a&month=2026-10")))).payslip).toMatchObject({ revision: 1 });
    expect((await overviewGet(req("/api/admin/payroll/overview?month=2026-10", { cookie: null }))).status).toBe(401);
    expect((await overviewGet(req("/api/admin/payroll/overview?month=bad"))).status).toBe(400);
  });
});
