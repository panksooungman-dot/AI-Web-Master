import { beforeEach, describe, expect, it } from "vitest";
import { buildConfig } from "@/lib/contract";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { hashPin } from "@/lib/contract/server/clock";
import { employeePayslips } from "@/lib/contract/server/payslip-view";
import { setStoreForTests } from "@/lib/contract/server/select";
import type { ContractStore, PayslipRecord, SubmissionRecord } from "@/lib/contract/server/store";
import { POST as payslipPost } from "@/app/api/payslip/route";

const ORIGIN = "http://localhost:4100";
const PNG = "data:image/png;base64," + "iVBORw0KGgo".repeat(30);
const NOW = new Date("2026-11-26T03:00:00.000Z");

const sub = (id: string, o: Partial<SubmissionRecord> = {}): SubmissionRecord => ({
  id,
  configToken: "tok-" + id,
  configSnapshot: buildConfig(null, { type: "hourly", wage: "10000", holiday: "none", payDay: "5", label: "" }),
  name: "홍길동",
  phone: "010-1234-5678",
  address: "경기 파주시 광탄면 만장산로 1",
  sig: PNG,
  signedAt: "2026-10-01T09:00:00.000Z",
  insForm: null,
  ownerSig: PNG,
  countersignedAt: "2026-10-01T10:00:00.000Z",
  editedAt: null,
  ...o,
});
const slip = (submissionId: string, month: string): PayslipRecord =>
  ({
    id: `${submissionId}-${month}`,
    submissionId,
    month,
    revision: 1,
    confirmedAt: "2026-11-01T00:00:00.000Z",
    payDate: "2026-12-05",
    employeeName: "홍길동",
    employeeNo: "20261001",
    biz: "123-45-67890",
    owner: "대표",
    statement: { gross: 987654, net: 900000 },
    input: { ack: true, secretAdjustment: "사업주가 넣은 조정 메모" },
    history: [{ revision: 0, confirmedAt: "2026-10-30T00:00:00.000Z", gross: 1, net: 1 }],
  }) as unknown as PayslipRecord;

let store: ContractStore;
beforeEach(async () => {
  store = createMemoryStore();
  setStoreForTests(store);
  await store.insertSubmission(sub("a"));
  await store.putClockPin({ submissionId: "a", ...hashPin("1234"), updatedAt: NOW.toISOString() });
  await store.putPayslip(slip("a", "2026-10"));
  await store.putPayslip(slip("a", "2026-11"));
});

describe("직원 급여명세서 조회", () => {
  it("PIN이 맞으면 본인의 확정된 명세서만 최신 달부터 돌려주고, 조정 입력·이력은 내려 주지 않는다", async () => {
    await store.insertSubmission(sub("b", { name: "김철수" }));
    await store.putClockPin({ submissionId: "b", ...hashPin("1234"), updatedAt: NOW.toISOString() });
    await store.putPayslip({ ...slip("b", "2026-11"), employeeName: "김철수" });
    const r = await employeePayslips(store, { id: "a", pin: "1234" }, NOW);
    expect(r.status).toBe(200);
    const list = r.body.payslips as Record<string, unknown>[];
    expect(list.map((p) => p.month)).toEqual(["2026-11", "2026-10"]); // 다른 직원(b)의 명세서는 없다
    expect(list.every((p) => p.employeeName === "홍길동")).toBe(true);
    expect(JSON.stringify(r.body)).not.toContain("사업주가 넣은 조정 메모");
    expect(list[0]).not.toHaveProperty("input");
    expect(list[0]).not.toHaveProperty("history");
    expect(list[0]).toMatchObject({ payDate: "2026-12-05", statement: { gross: 987654, net: 900000 } });
  });

  it("확정된 명세서가 없으면 빈 목록을 돌려준다", async () => {
    await store.insertSubmission(sub("c"));
    await store.putClockPin({ submissionId: "c", ...hashPin("4321"), updatedAt: NOW.toISOString() });
    const r = await employeePayslips(store, { id: "c", pin: "4321" }, NOW);
    expect(r).toMatchObject({ status: 200, body: { ok: true, payslips: [] } });
  });

  it("PIN 형식이 아니거나 없는 직원·PIN이 없는 직원·사업주 서명 전 직원은 같은 메시지로 거부한다", async () => {
    expect((await employeePayslips(store, { id: "a", pin: "12" }, NOW)).status).toBe(400);
    expect((await employeePayslips(store, { id: "a" }, NOW)).status).toBe(400);
    expect((await employeePayslips(store, { id: "nobody", pin: "1234" }, NOW)).status).toBe(404);
    await store.insertSubmission(sub("nopin"));
    await store.insertSubmission(sub("unsigned", { ownerSig: null, countersignedAt: null }));
    await store.putClockPin({ submissionId: "unsigned", ...hashPin("1234"), updatedAt: NOW.toISOString() });
    const a = await employeePayslips(store, { id: "nopin", pin: "1234" }, NOW);
    const b = await employeePayslips(store, { id: "unsigned", pin: "1234" }, NOW);
    expect([a.status, b.status]).toEqual([404, 404]);
    expect(a.body.error).toBe(b.body.error);
  });

  it("PIN을 5번 틀리면 10분간 잠기고, 잠긴 동안은 맞는 PIN도 받지 않으며, 시간이 지나면 풀린다", async () => {
    for (let i = 1; i <= 4; i++) expect(await employeePayslips(store, { id: "a", pin: "0000" }, NOW)).toMatchObject({ status: 401 });
    expect((await employeePayslips(store, { id: "a", pin: "0000" }, NOW)).body.error).toContain("잠겼습니다");
    expect(await employeePayslips(store, { id: "a", pin: "1234" }, NOW)).toMatchObject({ status: 429 });
    const later = new Date(NOW.getTime() + 11 * 60 * 1000);
    expect(await employeePayslips(store, { id: "a", pin: "1234" }, later)).toMatchObject({ status: 200 });
  });

  it("명세서 조회 잠금은 출퇴근 PIN 잠금과 따로 센다", async () => {
    for (let i = 0; i < 5; i++) await employeePayslips(store, { id: "a", pin: "0000" }, NOW);
    expect(await store.getAttempt("clock:a")).toBeNull();
    expect((await store.getAttempt("payslip:a"))?.lockedUntil).toBeGreaterThan(NOW.getTime());
  });

  it("맞는 PIN을 입력하면 이전에 틀린 횟수가 지워진다", async () => {
    for (let i = 0; i < 3; i++) await employeePayslips(store, { id: "a", pin: "0000" }, NOW);
    await employeePayslips(store, { id: "a", pin: "1234" }, NOW);
    expect(await store.getAttempt("payslip:a")).toBeNull();
  });
});

describe("POST /api/payslip", () => {
  const req = (body: unknown, origin: string | null = ORIGIN) => new Request(ORIGIN + "/api/payslip", { method: "POST", headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });

  it("로그인 없이 id와 PIN으로 조회하고, 다른 출처의 요청은 거부한다", async () => {
    const ok = await payslipPost(req({ id: "a", pin: "1234" }));
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { payslips: unknown[] }).payslips).toHaveLength(2);
    expect((await payslipPost(req({ id: "a", pin: "1234" }, "http://evil.example"))).status).toBe(403);
    expect((await payslipPost(req({ id: "a", pin: "9999" }))).status).toBe(401);
  });
});
