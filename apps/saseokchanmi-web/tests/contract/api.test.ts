import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { contractHTML } from "@/lib/contract";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { getStore, setStoreForTests } from "@/lib/contract/server/select";
import type { ContractStore } from "@/lib/contract/server/store";
import { POST as login } from "@/app/api/admin/login/route";
import { GET as sessionGet } from "@/app/api/admin/session/route";
import { GET as settingsGet, PUT as settingsPut } from "@/app/api/admin/settings/route";
import { GET as configsGet, POST as configsPost } from "@/app/api/admin/configs/route";
import { DELETE as configDelete, GET as configGet, PATCH as configPatch } from "@/app/api/admin/configs/[token]/route";
import { GET as submissionsGet } from "@/app/api/admin/submissions/route";
import { DELETE as subDelete, GET as subGet, PATCH as subPatch } from "@/app/api/admin/submissions/[id]/route";
import { POST as countersign } from "@/app/api/admin/submissions/[id]/countersign/route";
import { GET as workerGet } from "@/app/api/contract/[token]/route";
import { POST as workerSubmit } from "@/app/api/contract/[token]/submit/route";

const ORIGIN = "http://localhost:4100";
const PASSWORD = "correct-horse-battery";
const PNG = "data:image/png;base64," + "iVBORw0KGgo".repeat(30);
const OWNER_PNG = "data:image/png;base64," + "T3duZXJTaWc".repeat(30);

interface Opts {
  method?: string;
  body?: unknown;
  cookie?: string;
  origin?: string | null;
  headers?: Record<string, string>;
}
const req = (p: string, o: Opts = {}) => {
  const headers: Record<string, string> = { "content-type": "application/json", ...(o.headers ?? {}) };
  if (o.origin !== null) headers.origin = o.origin ?? ORIGIN;
  if (o.cookie) headers.cookie = o.cookie;
  return new Request(ORIGIN + p, { method: o.method ?? "GET", headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
};
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const data = async (r: Response) => (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function adminCookie(): Promise<string> {
  const res = await login(req("/api/admin/login", { method: "POST", body: { password: PASSWORD } }));
  expect(res.status).toBe(200);
  const set = res.headers.get("set-cookie")!;
  expect(set).toContain("HttpOnly");
  return set.split(";")[0];
}

const hourly = { type: "hourly", label: "홍길동", wage: "12000", date: "2026-12-01", start: "2026-12-01" };
const worker = { name: "홍길동", phone: "010-1234-5678", address: "경기 파주시 광탄면 만장산로 1", sig: PNG };

async function createConfig(cookie: string, over: Record<string, unknown> = {}) {
  const res = await configsPost(req("/api/admin/configs", { method: "POST", cookie, body: { ...hourly, ...over } }));
  expect(res.status).toBe(201);
  return (await data(res)).token as string;
}

beforeEach(() => {
  setStoreForTests(createMemoryStore());
  process.env.CONTRACT_ADMIN_PASSWORD = PASSWORD;
  process.env.CONTRACT_SESSION_SECRET = "s".repeat(40);
  delete process.env.DATABASE_URL;
});
afterEach(() => {
  setStoreForTests(null);
  delete process.env.CONTRACT_ADMIN_PASSWORD;
  delete process.env.CONTRACT_SESSION_SECRET;
  delete process.env.DATABASE_URL;
});

describe("관리자 접근 차단 (시나리오 9)", () => {
  it("로그인 없이는 모든 관리자 API가 401", async () => {
    const calls: Array<Promise<Response>> = [
      settingsGet(req("/x")),
      settingsPut(req("/x", { method: "PUT", body: {} })),
      configsGet(req("/x")),
      configsPost(req("/x", { method: "POST", body: hourly })),
      configGet(req("/x"), ctx({ token: "t" })),
      configPatch(req("/x", { method: "PATCH", body: {} }), ctx({ token: "t" })),
      configDelete(req("/x", { method: "DELETE" }), ctx({ token: "t" })),
      submissionsGet(req("/x")),
      subGet(req("/x"), ctx({ id: "i" })),
      subPatch(req("/x", { method: "PATCH", body: {} }), ctx({ id: "i" })),
      subDelete(req("/x", { method: "DELETE" }), ctx({ id: "i" })),
      countersign(req("/x", { method: "POST", body: {} }), ctx({ id: "i" })),
    ];
    for (const r of await Promise.all(calls)) expect(r.status).toBe(401);
  });

  it("변조된 쿠키는 거부된다", async () => {
    const res = await configsGet(req("/x", { cookie: "contract_admin=abc.def" }));
    expect(res.status).toBe(401);
  });

  it("관리자 인증이 설정되지 않았으면 503", async () => {
    delete process.env.CONTRACT_ADMIN_PASSWORD;
    expect((await configsGet(req("/x"))).status).toBe(503);
    expect((await login(req("/x", { method: "POST", body: { password: "whatever-long" } }))).status).toBe(503);
  });

  it("다른 출처에서 온 변경 요청은 로그인 쿠키가 있어도 403", async () => {
    const cookie = await adminCookie();
    const evil = await configsPost(req("/x", { method: "POST", cookie, origin: "https://evil.example", body: hourly }));
    expect(evil.status).toBe(403);
    const noOrigin = await configsPost(req("/x", { method: "POST", cookie, origin: null, body: hourly }));
    expect(noOrigin.status).toBe(403);
    const ok = await configsPost(req("/x", { method: "POST", cookie, body: hourly }));
    expect(ok.status).toBe(201);
  });

  it("JSON이 아닌 본문은 415", async () => {
    const cookie = await adminCookie();
    const r = new Request(ORIGIN + "/x", { method: "POST", headers: { origin: ORIGIN, cookie, "content-type": "text/plain" }, body: "{}" });
    expect((await configsPost(r)).status).toBe(415);
  });
});

describe("로그인", () => {
  it("틀린 비밀번호는 401, 5번 틀리면 429로 잠긴다(맞는 비밀번호도 잠금 중에는 거부)", async () => {
    const bad = () => login(req("/x", { method: "POST", body: { password: "wrong-password-1" }, headers: { "x-forwarded-for": "9.9.9.9" } }));
    for (let i = 0; i < 5; i++) expect((await bad()).status).toBe(401);
    expect((await bad()).status).toBe(429);
    const right = await login(req("/x", { method: "POST", body: { password: PASSWORD }, headers: { "x-forwarded-for": "9.9.9.9" } }));
    expect(right.status).toBe(429);
    // 다른 IP는 영향 없음
    const other = await login(req("/x", { method: "POST", body: { password: PASSWORD }, headers: { "x-forwarded-for": "8.8.8.8" } }));
    expect(other.status).toBe(200);
  });

  it("세션 확인 API", async () => {
    expect(await data(await sessionGet(req("/x")))).toMatchObject({ configured: true, authenticated: false });
    const cookie = await adminCookie();
    expect(await data(await sessionGet(req("/x", { cookie })))).toMatchObject({ authenticated: true });
  });
});

describe("직원 계약 만들기 → 근로자 제출 → 관리자 확인 (시나리오 6, 7, 8)", () => {
  it("전체 흐름", async () => {
    const cookie = await adminCookie();
    const token = await createConfig(cookie);
    expect(token.length).toBeGreaterThanOrEqual(10);

    // 로그인 없이 근로자 링크로 조회
    const open = await data(await workerGet(req("/x"), ctx({ token })));
    expect(open.state).toBe("open");
    expect(open.config.wage).toBe("12000");
    expect(open.config.label).toBe(""); // 관리자 메모는 내보내지 않는다
    expect(open.config.ownerSig).toBe("");
    expect(open.hasOwnerSig).toBe(false);

    // 제출 전 상태: 미제출
    const before = await data(await configsGet(req("/x", { cookie })));
    expect(before.items[0]).toMatchObject({ token, label: "홍길동", status: "unsubmitted", statusLabel: "미제출" });
    expect(before.items[0].warnings[0]).toContain("임금지급일·지급방법");

    // 제출
    const done = await workerSubmit(req("/x", { method: "POST", body: worker }), ctx({ token }));
    expect(done.status).toBe(201);
    const body = await data(done);
    expect(body.signedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.snapshot.wage).toBe("12000");

    // 재서명 불가 / 조회 시 내용 비공개
    expect((await workerSubmit(req("/x", { method: "POST", body: worker }), ctx({ token }))).status).toBe(409);
    expect(await data(await workerGet(req("/x"), ctx({ token })))).toEqual({ ok: true, state: "submitted" });

    // 관리자: 제출 현황
    const list = await data(await submissionsGet(req("/x", { cookie })));
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({ name: "홍길동", phone: "010-1234-5678", label: "홍길동", ownerSigned: false });
    expect(list.items[0].sig).toBeUndefined(); // 목록에는 서명 이미지를 싣지 않는다
    const status = await data(await configGet(req("/x", { cookie }), ctx({ token })));
    expect(status.status).toBe("awaiting_owner");

    // 근로자 정보 수정: 성명·연락처·주소만, 서명과 계약 조건은 그대로
    const id = list.items[0].id as string;
    const edited = await subPatch(req("/x", { method: "PATCH", cookie, body: { name: "홍길순", phone: "01099998888", address: "경기 파주시 월롱면 1길 2", sig: "x", configSnapshot: { wage: "1" } } }), ctx({ id }));
    expect(edited.status).toBe(200);
    const full = (await data(await subGet(req("/x", { cookie }), ctx({ id })))).submission;
    expect(full).toMatchObject({ name: "홍길순", phone: "010-9999-8888", sig: PNG });
    expect(full.configSnapshot.wage).toBe("12000");
    expect(full.editedAt).toBeTruthy();
    expect((await subPatch(req("/x", { method: "PATCH", cookie, body: { name: "홍", phone: "1", address: "a" } }), ctx({ id }))).status).toBe(400);

    // 삭제
    expect((await subDelete(req("/x", { method: "DELETE", cookie }), ctx({ id }))).status).toBe(200);
    expect((await subGet(req("/x", { cookie }), ctx({ id }))).status).toBe(404);
  });

  it("직원 설정·공통 설정을 나중에 바꿔도 이미 제출된 계약서는 서명 당시 내용 그대로 (시나리오 7)", async () => {
    const cookie = await adminCookie();
    const token = await createConfig(cookie);
    await workerSubmit(req("/x", { method: "POST", body: worker }), ctx({ token }));
    const id = (await data(await submissionsGet(req("/x", { cookie })))).items[0].id as string;

    await configPatch(req("/x", { method: "PATCH", cookie, body: { wage: "15000", duty: "주방" } }), ctx({ token }));
    await settingsPut(req("/x", { method: "PUT", cookie, body: { tel: "000-0000-0000", biz: "다른상호" } }));

    const snap = (await data(await subGet(req("/x", { cookie }), ctx({ id })))).submission.configSnapshot;
    expect(snap.wage).toBe("12000");
    expect(snap.tel).toBe("031-945-8004");
    expect(snap.biz).toBe("사색찬미한정식");
    const html = contractHTML({ name: "홍길동" }, snap);
    expect(html).toContain("12,000원");
    expect(html).toContain("031-945-8004");
    expect(html).not.toContain("15,000원");
  });

  it("클라이언트가 보낸 계약 조건·시각은 무시하고 서버가 만든 값을 쓴다", async () => {
    const cookie = await adminCookie();
    const token = await createConfig(cookie);
    const r = await workerSubmit(
      req("/x", { method: "POST", body: { ...worker, cfg: { wage: "1" }, configSnapshot: { wage: "1" }, signedAt: "2000-01-01T00:00:00Z", ownerSig: OWNER_PNG } }),
      ctx({ token }),
    );
    expect(r.status).toBe(201);
    const id = (await data(await submissionsGet(req("/x", { cookie })))).items[0].id as string;
    const s = (await data(await subGet(req("/x", { cookie }), ctx({ id })))).submission;
    expect(s.configSnapshot.wage).toBe("12000");
    expect(s.signedAt.startsWith("2000")).toBe(false);
    expect(s.ownerSig).toBeNull();
  });

  it("존재하지 않는 토큰은 404", async () => {
    expect((await workerGet(req("/x"), ctx({ token: "nope" }))).status).toBe(404);
    expect((await workerSubmit(req("/x", { method: "POST", body: worker }), ctx({ token: "nope" }))).status).toBe(404);
  });

  it("입력 검증: 이름·전화·주소·서명", async () => {
    const cookie = await adminCookie();
    const token = await createConfig(cookie);
    const post = (b: unknown) => workerSubmit(req("/x", { method: "POST", body: b }), ctx({ token }));
    const bad = await post({ ...worker, name: "홍", phone: "12", address: "짧음" });
    expect(bad.status).toBe(400);
    expect((await data(bad)).fields).toMatchObject({ name: expect.any(String), phone: expect.any(String), address: expect.any(String) });
    expect((await post({ ...worker, sig: "javascript:alert(1)" })).status).toBe(400);
    expect((await post({ ...worker, sig: "data:image/svg+xml;base64,AAAA" })).status).toBe(400);
    expect((await post({ ...worker, sig: "data:image/png;base64,AA" })).status).toBe(400);
    expect((await post({ ...worker, sig: undefined })).status).toBe(400);
    expect((await post(null)).status).toBe(400);
    expect((await post(worker)).status).toBe(201);
  });
});

describe("사회보험 사유서 (시나리오 4, 5)", () => {
  const ins = { emp: "y", acc: "y", pen: "n", hlt: "n" };
  const form = { r: { pen: "1", hlt: "1" }, other: "", birth: "1990-05-21", detail: "주 2일 근무", c: [true, true, true] };

  it("미적용 보험이 있으면 사유서 없이는 제출할 수 없고, 제출하면 스냅샷에 사유서가 저장된다", async () => {
    const cookie = await adminCookie();
    const token = await createConfig(cookie, { ins });
    const post = (b: unknown) => workerSubmit(req("/x", { method: "POST", body: b }), ctx({ token }));
    expect((await post(worker)).status).toBe(400);
    expect((await post({ ...worker, insForm: { ...form, c: [true, true, false] } })).status).toBe(400);
    expect((await post({ ...worker, insForm: form })).status).toBe(201);
    const id = (await data(await submissionsGet(req("/x", { cookie })))).items[0].id as string;
    const s = (await data(await subGet(req("/x", { cookie }), ctx({ id })))).submission;
    expect(s.insForm.birth).toBe("1990-05-21");
    const html = contractHTML({ name: s.name, phone: s.phone, address: s.address, signedAt: s.signedAt, insForm: s.insForm }, s.configSnapshot);
    expect(html).toContain("4대 사회보험 미적용 사유서");
  });

  it("전부 적용이면 사유서를 받지 않고 저장하지도 않는다", async () => {
    const cookie = await adminCookie();
    const token = await createConfig(cookie);
    expect((await workerSubmit(req("/x", { method: "POST", body: { ...worker, insForm: form } }), ctx({ token }))).status).toBe(201);
    const id = (await data(await submissionsGet(req("/x", { cookie })))).items[0].id as string;
    expect((await data(await subGet(req("/x", { cookie }), ctx({ id })))).submission.insForm).toBeNull();
  });
});

describe("사업주 서명", () => {
  it("공통 서명이 있으면 자동으로 들어가 확정, 없으면 대기 후 개별 서명으로 확정", async () => {
    const cookie = await adminCookie();
    // 공통 서명 없음
    const t1 = await createConfig(cookie, { label: "가" });
    await workerSubmit(req("/x", { method: "POST", body: worker }), ctx({ token: t1 }));
    const list1 = (await data(await submissionsGet(req("/x", { cookie })))).items;
    expect(list1[0].ownerSigned).toBe(false);
    const id1 = list1[0].id as string;
    expect((await countersign(req("/x", { method: "POST", cookie, body: { ownerSig: "data:text/html;base64,AAAA" } }), ctx({ id: id1 }))).status).toBe(400);
    expect((await countersign(req("/x", { method: "POST", cookie, body: { ownerSig: OWNER_PNG } }), ctx({ id: id1 }))).status).toBe(200);
    expect((await countersign(req("/x", { method: "POST", cookie, body: { ownerSig: OWNER_PNG } }), ctx({ id: id1 }))).status).toBe(409);
    expect((await data(await configGet(req("/x", { cookie }), ctx({ token: t1 })))).status).toBe("confirmed");

    // 공통 서명 등록 후 새로 제출 → 자동 확정
    expect((await settingsPut(req("/x", { method: "PUT", cookie, body: { ownerSig: OWNER_PNG } }))).status).toBe(200);
    const t2 = await createConfig(cookie, { label: "나" });
    const open = await data(await workerGet(req("/x"), ctx({ token: t2 })));
    // 링크만 아는 사람에게는 사업주 서명 이미지를 내보내지 않고, 등록 여부만 알려 준다.
    expect(open.config.ownerSig).toBe("");
    expect(open.hasOwnerSig).toBe(true);
    expect(JSON.stringify(open)).not.toContain(OWNER_PNG);
    await workerSubmit(req("/x", { method: "POST", body: worker }), ctx({ token: t2 }));
    expect((await data(await configGet(req("/x", { cookie }), ctx({ token: t2 })))).status).toBe("confirmed");
    const id2 = (await data(await submissionsGet(req("/x", { cookie })))).items.find((i: { configToken: string }) => i.configToken === t2).id as string;
    expect((await countersign(req("/x", { method: "POST", cookie, body: { ownerSig: OWNER_PNG } }), ctx({ id: id2 }))).status).toBe(409);
  });

  it("공통 설정 저장: 잘못된 값은 400, 보낸 항목만 바뀐다, 최저시급 저장", async () => {
    const cookie = await adminCookie();
    expect((await settingsPut(req("/x", { method: "PUT", cookie, body: { ownerSig: "data:image/gif;base64,AAAA" } }))).status).toBe(400);
    expect((await settingsPut(req("/x", { method: "PUT", cookie, body: { tel: "031-111-2222", minWage: 11000 } }))).status).toBe(200);
    const s = await data(await settingsGet(req("/x", { cookie })));
    expect(s.company).toMatchObject({ tel: "031-111-2222", biz: "사색찬미한정식", owner: "황명분" });
    expect(s.minWage).toBe(11000);
  });
});

describe("직원 계약 저장 검증 (시나리오 10)", () => {
  it("임금지급일·지급방법이 비어 있어도 저장되고 경고만 나온다", async () => {
    const cookie = await adminCookie();
    const res = await configsPost(req("/x", { method: "POST", cookie, body: hourly }));
    expect(res.status).toBe(201);
    expect((await data(res)).warnings[0]).toContain("임금지급일·지급방법");
    const filled = await configsPost(req("/x", { method: "POST", cookie, body: { ...hourly, payDay: "10", payMethod: "bank" } }));
    expect((await data(filled)).warnings).toEqual([]);
  });

  it("직원 이름·임금·근무요일이 없거나 형식이 틀리면 400", async () => {
    const cookie = await adminCookie();
    const post = (b: unknown) => configsPost(req("/x", { method: "POST", cookie, body: b }));
    expect((await post({ ...hourly, label: "" })).status).toBe(400);
    expect((await post({ ...hourly, wage: "" })).status).toBe(400);
    expect((await post({ ...hourly, days: "0" })).status).toBe(400);
    expect((await post({ ...hourly, type: "daily" })).status).toBe(400);
    expect((await post({ ...hourly, workS: "99:99" })).status).toBe(400);
    expect((await configsGet(req("/x", { cookie })).then(data)).items).toHaveLength(0);
  });

  it("수정·삭제", async () => {
    const cookie = await adminCookie();
    const token = await createConfig(cookie);
    expect((await configPatch(req("/x", { method: "PATCH", cookie, body: { wage: "13000" } }), ctx({ token }))).status).toBe(200);
    expect((await data(await configGet(req("/x", { cookie }), ctx({ token })))).config.wage).toBe("13000");
    expect((await configPatch(req("/x", { method: "PATCH", cookie, body: { wage: "" } }), ctx({ token }))).status).toBe(400);
    expect((await configPatch(req("/x", { method: "PATCH", cookie, body: {} }), ctx({ token: "none" }))).status).toBe(404);
    expect((await configDelete(req("/x", { method: "DELETE", cookie }), ctx({ token }))).status).toBe(200);
    expect((await configGet(req("/x", { cookie }), ctx({ token }))).status).toBe(404);
    expect((await workerGet(req("/x"), ctx({ token }))).status).toBe(404);
  });
});

describe("저장소를 쓸 수 없을 때", () => {
  it("운영(production)에서 DATABASE_URL이 없으면 근로자 API는 503 (파일에 조용히 쓰지 않는다)", async () => {
    setStoreForTests(null);
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "production";
    try {
      const res = await workerGet(req("/x"), ctx({ token: "t" }));
      expect(res.status).toBe(503);
      expect((await data(res)).error).toContain("DATABASE_URL");
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prev ?? "test";
    }
  });

  it("DATABASE_URL이 있으면 DB 저장소를 고른다 (연결은 첫 질의 때)", () => {
    setStoreForTests(null);
    process.env.DATABASE_URL = "postgres://user:pw@127.0.0.1:1/db";
    const store = getStore();
    expect(typeof store.insertSubmission).toBe("function");
    expect(getStore()).toBe(store); // 한 번 만든 저장소를 재사용한다
  });

  it("DB 오류는 내용(접속 정보 등)을 숨긴 500으로 돌려준다", async () => {
    const leaky = new Error("connection to postgres://user:secret-pw@host failed");
    const broken = new Proxy({}, { get: () => () => Promise.reject(leaky) }) as ContractStore;
    setStoreForTests(broken);
    const res = await workerGet(req("/x"), ctx({ token: "t" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await data(res))).not.toContain("secret-pw");
  });
});
