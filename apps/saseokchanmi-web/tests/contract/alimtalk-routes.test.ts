import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildConfig } from "@/lib/contract";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { setStoreForTests } from "@/lib/contract/server/select";
import type { ContractStore, PayslipRecord, SubmissionRecord } from "@/lib/contract/server/store";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as contractNotify } from "@/app/api/admin/configs/[token]/notify/route";
import { POST as payslipNotify } from "@/app/api/admin/payroll/notify/route";

const ORIGIN = "http://localhost:4100";
const KAKAO_ENV = {
  SOLAPI_API_KEY: "k",
  SOLAPI_API_SECRET: "s",
  SOLAPI_FROM: "021234567",
  SOLAPI_KAKAO_PFID: "KA01PF",
  SOLAPI_TPL_CONTRACT: "KA01TP-contract",
  SOLAPI_TPL_PAYSLIP: "KA01TP-payslip",
};
const PNG = "data:image/png;base64," + "iVBORw0KGgo".repeat(30);

let store: ContractStore;
let cookie = "";
const req = (body: unknown, o: { cookie?: string | null; origin?: string } = {}) => {
  const headers: Record<string, string> = { "content-type": "application/json", origin: o.origin ?? ORIGIN };
  const c = o.cookie === undefined ? cookie : o.cookie;
  if (c) headers.cookie = c;
  return new Request(ORIGIN + "/x", { method: "POST", headers, body: JSON.stringify(body) });
};
const ctx = (token: string) => ({ params: Promise.resolve({ token }) });
const sentMessages = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map((c) => JSON.parse((c[1] as { body: string }).body).messages[0]);

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  store = createMemoryStore();
  setStoreForTests(store);
  process.env.CONTRACT_ADMIN_PASSWORD = "correct-horse-battery";
  process.env.CONTRACT_SESSION_SECRET = "s".repeat(40);
  delete process.env.DATABASE_URL;
  const res = await login(new Request(ORIGIN + "/api/admin/login", { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN }, body: JSON.stringify({ password: "correct-horse-battery" }) }));
  cookie = res.headers.get("set-cookie")!.split(";")[0];
  fetchSpy = vi.fn(async () => new Response(JSON.stringify({ groupInfo: { count: { total: 1, registeredFailed: 0 } } }), { status: 200 }));
  vi.stubGlobal("fetch", fetchSpy);
  for (const k of Object.keys(KAKAO_ENV)) delete process.env[k];
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of [...Object.keys(KAKAO_ENV), "CONTRACT_ADMIN_PASSWORD", "CONTRACT_SESSION_SECRET"]) delete process.env[k];
});

const enableKakao = () => Object.assign(process.env, KAKAO_ENV);
const putConfig = () => store.putConfig({ token: "tok1", config: { type: "hourly", wage: "12000", label: "홍길동" } as never, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" });

describe("계약서 작성 링크 알림톡", () => {
  it("로그인과 같은 출처가 필요하다", async () => {
    await putConfig();
    expect((await contractNotify(req({ phone: "010-1234-5678" }, { cookie: null }), ctx("tok1"))).status).toBe(401);
    expect((await contractNotify(req({ phone: "010-1234-5678" }, { origin: "https://evil.example" }), ctx("tok1"))).status).toBe(403);
  });

  it("설정이 비어 있으면 503으로 이유를 알려 주고 아무것도 보내지 않는다", async () => {
    await putConfig();
    const r = await contractNotify(req({ phone: "010-1234-5678" }), ctx("tok1"));
    expect(r.status).toBe(503);
    expect(((await r.json()) as { error: string }).error).toContain("SOLAPI_KAKAO_PFID");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("번호가 틀리면 400, 없는 직원 계약이면 404", async () => {
    enableKakao();
    await putConfig();
    expect((await contractNotify(req({ phone: "12345" }), ctx("tok1"))).status).toBe(400);
    expect((await contractNotify(req({ phone: "010-1234-5678" }), ctx("nope"))).status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("직원 번호로 계약서 링크가 담긴 알림톡을 보낸다", async () => {
    enableKakao();
    await putConfig();
    const r = await contractNotify(req({ phone: "010-1234-5678" }), ctx("tok1"));
    expect(r.status).toBe(200);
    const m = sentMessages(fetchSpy)[0];
    expect(m.to).toBe("01012345678");
    expect(m.kakaoOptions.templateId).toBe("KA01TP-contract");
    expect(m.kakaoOptions.variables).toEqual({ "#{이름}": "홍길동" });
    expect(m.kakaoOptions.buttons[0].linkMo).toMatch(/\/contract\/tok1$/);
  });

  it("SOLAPI가 거부하면 502", async () => {
    enableKakao();
    await putConfig();
    fetchSpy.mockResolvedValueOnce(new Response("no", { status: 403 }));
    expect((await contractNotify(req({ phone: "010-1234-5678" }), ctx("tok1"))).status).toBe(502);
  });
});

describe("급여명세서 확정 안내 알림톡", () => {
  const sub: SubmissionRecord = {
    id: "a",
    configToken: "tok1",
    configSnapshot: buildConfig(null, { type: "hourly", wage: "12000", label: "" }),
    name: "홍길동",
    phone: "010-1234-5678",
    address: "경기 파주시",
    sig: PNG,
    signedAt: "2026-11-01T09:00:00.000Z",
    insForm: null,
    ownerSig: PNG,
    countersignedAt: "2026-11-01T10:00:00.000Z",
    editedAt: null,
  };
  const slip = { id: "p1", submissionId: "a", month: "2026-10", revision: 1, confirmedAt: "2026-11-01T00:00:00.000Z", payDate: "2026-11-10", employeeName: "홍길동", statement: { gross: 987654 } } as unknown as PayslipRecord;

  it("확정된 명세서가 없으면 404, 있으면 금액 없이 안내만 보낸다", async () => {
    enableKakao();
    await store.insertSubmission(sub);
    expect((await payslipNotify(req({ id: "a", month: "2026-10" }))).status).toBe(404);
    await store.putPayslip(slip);
    expect((await payslipNotify(req({ id: "a", month: "2026-10" }))).status).toBe(200);
    const m = sentMessages(fetchSpy)[0];
    expect(m.to).toBe("01012345678");
    expect(m.kakaoOptions.templateId).toBe("KA01TP-payslip");
    expect(m.kakaoOptions.variables).toEqual({ "#{이름}": "홍길동", "#{귀속월}": "2026년 10월", "#{지급일}": "2026-11-10" });
    expect(JSON.stringify(m)).not.toContain("987654");
  });

  it("월 형식이 틀리면 400, 설정이 비어 있으면 503", async () => {
    expect((await payslipNotify(req({ id: "a", month: "10월" }))).status).toBe(400);
    expect((await payslipNotify(req({ id: "a", month: "2026-10" }))).status).toBe(503);
  });
});
