import { beforeEach, describe, expect, it } from "vitest";
import { buildConfig } from "@/lib/contract";
import { buildSummary, summaryCsv, summaryHTML, type SummaryInput } from "@/lib/contract/clock-summary";
import type { SheetConfig, SheetEvent } from "@/lib/contract/clock-sheet";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { addEvent, setPin, summaryData } from "@/lib/contract/server/clock";
import { POST as login } from "@/app/api/admin/login/route";
import { setStoreForTests } from "@/lib/contract/server/select";
import type { ContractStore, SubmissionRecord } from "@/lib/contract/server/store";
import { GET as summaryGet } from "@/app/api/admin/clock/summary/route";

const k = (s: string) => new Date(`${s}:00+09:00`).toISOString();
let n = 0;
const ev = (kind: "in" | "out", at: string, source: "device" | "admin" = "device"): SheetEvent => ({ id: `e${++n}`, kind, at: k(at), source, note: "" });
const cfgOf = (over: Parameters<typeof buildConfig>[1] = {}): SheetConfig => {
  const c = buildConfig(null, { type: "hourly", wage: "12000", ...over });
  return { type: c.type, wageType: c.wageType, wage: c.wage, start: c.start, useSched: c.useSched, sched: c.sched, workS: c.workS, workE: c.workE, brkS: c.brkS, brkE: c.brkE, days: c.days };
};
const shift = (day: string, a = "10:00", b = "14:00") => [ev("in", `2026-11-${day}T${a}`), ev("out", `2026-11-${day}T${b}`)];

describe("전 직원 월간 요약 계산", () => {
  const emps: SummaryInput[] = [
    { id: "z", name: "황보민", config: cfgOf(), events: [...shift("02"), ...shift("03")] },
    { id: "a", name: "가나다", config: cfgOf(), events: [...shift("02", "10:00", "12:30"), ev("in", "2026-11-05T10:00")] },
    { id: "m", name: "월급이", config: cfgOf({ type: "monthly", wage: "2500000" }), events: shift("04") },
  ];

  it("한글 이름순으로 정렬하고 직원별 합계·시급제 임금·월급제 구분을 계산한다", () => {
    const s = buildSummary({ month: "2026-11", employees: emps, deductBreak: false });
    expect(s.rows.map((r) => r.name)).toEqual(["가나다", "월급이", "황보민"]);
    const byName = Object.fromEntries(s.rows.map((r) => [r.name, r]));
    expect(byName["황보민"]).toMatchObject({ workedDays: 2, workedMin: 480, payType: "hourly", wage: 12000, pay: 96000, openCount: 0 });
    expect(byName["가나다"]).toMatchObject({ workedDays: 2, workedMin: 150, openCount: 1, pay: 30000 });
    expect(byName["월급이"]).toMatchObject({ payType: "monthly", pay: null });
    expect(s.totals).toMatchObject({ workedDays: 5, workedMin: 150 + 240 + 480, pay: 126000, hasPay: true, openCount: 1, strayCount: 0 });
  });

  it("직원 한 명의 값은 그 직원의 월간 기록부와 같은 계산을 쓰고, 관리자 입력 기록은 표시된다", () => {
    const s = buildSummary({ month: "2026-11", employees: [{ id: "x", name: "정정됨", config: cfgOf(), events: [ev("in", "2026-11-02T10:00", "admin"), ev("out", "2026-11-02T14:00")] }], deductBreak: false });
    expect(s.rows[0]).toMatchObject({ edited: true, workedMin: 240 });
  });

  it("직원이 없으면 빈 요약", () => {
    const s = buildSummary({ month: "2026-11", employees: [], deductBreak: true });
    expect(s.rows).toEqual([]);
    expect(s.totals).toMatchObject({ workedMin: 0, hasPay: false });
  });
});

describe("요약 CSV·HTML", () => {
  const build = (name: string) => buildSummary({ month: "2026-11", employees: [{ id: "x", name, config: cfgOf(), events: shift("02") }], deductBreak: false });

  it("CSV: CRLF, 머리글, 합계 줄, 쉼표·따옴표 이스케이프, 수식 문자로 시작하는 이름은 작은따옴표를 붙인다", () => {
    const csv = summaryCsv(build('=HYPERLINK("x"),홍'));
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0].startsWith("직원,근무일수,실제 근무(분)")).toBe(true);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(`"'=HYPERLINK(""x""),홍"`);
    expect(lines[1]).toContain(",1,240,4시간,");
    expect(lines[2].startsWith("합계,1,240,4시간")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("CSV: 음수(차이) 숫자 칸에는 작은따옴표를 붙이지 않는다", () => {
    const s = buildSummary({ month: "2026-11", employees: [{ id: "x", name: "홍", config: cfgOf({ useSched: true, start: "2026-11-01" }), events: shift("02") }], deductBreak: false });
    const csv = summaryCsv(s);
    expect(csv).not.toContain("'-");
  });

  it("HTML: 사용자 입력은 이스케이프되고 합계·안내문이 들어간다", () => {
    const html = summaryHTML(build("<img src=x onerror=alert(1)>"), { biz: "<b>상호</b>", deductBreak: false });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>상호</b>");
    expect(html).toContain("&lt;img");
    expect(html).toContain("합계");
    expect(html).toContain("가산수당은 포함하지 않습니다");
  });
});

const sub = (id: string, name: string, confirmed = true): SubmissionRecord => ({
  id,
  configToken: "tok-" + id,
  configSnapshot: buildConfig(null, { type: "hourly", wage: "12000", label: "" }),
  name,
  phone: "010-1234-5678",
  address: "경기 파주시 광탄면 만장산로 1",
  sig: "data:image/png;base64," + "iVBORw0KGgo".repeat(30),
  signedAt: "2026-11-14T09:00:00.000Z",
  insForm: null,
  ownerSig: confirmed ? "data:image/png;base64," + "iVBORw0KGgo".repeat(30) : null,
  countersignedAt: confirmed ? "2026-11-14T10:00:00.000Z" : null,
  editedAt: null,
});

describe("전 직원 월간 요약 데이터·API", () => {
  const NOW = new Date("2026-11-20T03:00:00.000Z");
  let store: ContractStore;
  beforeEach(async () => {
    store = createMemoryStore();
    setStoreForTests(store);
    process.env.CONTRACT_ADMIN_PASSWORD = "correct-horse-battery";
    process.env.CONTRACT_SESSION_SECRET = "s".repeat(40);
    delete process.env.DATABASE_URL;
    await store.insertSubmission(sub("a", "홍길동"));
    await store.insertSubmission(sub("b", "김철수", false)); // 사업주 서명 대기
    await store.insertSubmission(sub("c", "이영희")); // PIN·기록 없음
    await store.insertSubmission(sub("d", "박민수")); // PIN 없고 이 달 기록만 있음
    await setPin(store, "a", "1234");
    await addEvent(store, { submissionId: "a", kind: "in", at: "2026-11-02T10:00", reason: "시험" }, NOW);
    await addEvent(store, { submissionId: "d", kind: "in", at: "2026-11-03T10:00", reason: "시험" }, NOW);
  });

  it("확정 직원 중 PIN이 있거나 이 달 기록이 있는 사람만, 서명·연락처 없이 돌려준다", async () => {
    const r = await summaryData(store, "2026-11");
    expect(r.status).toBe(200);
    expect((r.body.employees as { id: string }[]).map((e) => e.id).sort()).toEqual(["a", "d"]);
    expect(r.body).toMatchObject({ ok: true, month: "2026-11", biz: "사색찬미한정식" });
    expect(JSON.stringify(r.body)).not.toMatch(/"sig"|"phone"|"address"|ownerSig/);
  });

  it("달 형식이 틀리면 400", async () => {
    expect((await summaryData(store, "2026-13")).status).toBe(400);
    expect((await summaryData(store, "")).status).toBe(400);
  });

  it("API: 관리자 로그인 없이는 401, 로그인하면 200", async () => {
    const url = "http://localhost:4100/api/admin/clock/summary?month=2026-11";
    expect((await summaryGet(new Request(url))).status).toBe(401);
    const res = await login(new Request("http://localhost:4100/api/admin/login", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:4100" }, body: JSON.stringify({ password: "correct-horse-battery" }) }));
    const cookie = res.headers.get("set-cookie")!.split(";")[0];
    const ok = await summaryGet(new Request(url, { headers: { cookie } }));
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { employees: unknown[] }).employees).toHaveLength(2);
    expect((await summaryGet(new Request(url.replace("2026-11", "bad"), { headers: { cookie } }))).status).toBe(400);
  });
});
