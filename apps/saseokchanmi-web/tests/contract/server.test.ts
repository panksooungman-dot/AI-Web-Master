import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseCompanySettings, parseWorkerConfig } from "@/lib/contract";
import { clearSessionCookie, createSessionToken, getAuthConfig, isAdminRequest, passwordMatches, readCookie, sessionCookie, SESSION_COOKIE, SESSION_TTL_SEC, verifySessionToken } from "@/lib/contract/server/auth";
import { createFileStore, createMemoryStore } from "@/lib/contract/server/backends";
import { clearLoginFailures, loginLockSeconds, recordLoginFailure } from "@/lib/contract/server/http";
import type { SubmissionRecord } from "@/lib/contract/server/store";
import { buildConfig } from "@/lib/contract";

const SECRET = "s".repeat(40);

describe("관리자 인증", () => {
  it("환경변수가 없거나 짧으면 설정되지 않은 것으로 본다", () => {
    expect(getAuthConfig({}).configured).toBe(false);
    expect(getAuthConfig({ CONTRACT_ADMIN_PASSWORD: "short" }).problem).toContain("10자");
    expect(getAuthConfig({ CONTRACT_ADMIN_PASSWORD: "long-enough-pw", NODE_ENV: "production" }).problem).toContain("CONTRACT_SESSION_SECRET");
    expect(getAuthConfig({ CONTRACT_ADMIN_PASSWORD: "long-enough-pw", CONTRACT_SESSION_SECRET: "short" }).configured).toBe(false);
    expect(getAuthConfig({ CONTRACT_ADMIN_PASSWORD: "long-enough-pw", CONTRACT_SESSION_SECRET: SECRET }).configured).toBe(true);
  });

  it("개발에서만 임시 서명키를 허용하고 운영에서는 허용하지 않는다", () => {
    expect(getAuthConfig({ CONTRACT_ADMIN_PASSWORD: "long-enough-pw", NODE_ENV: "development" }).configured).toBe(true);
    expect(getAuthConfig({ CONTRACT_ADMIN_PASSWORD: "long-enough-pw", NODE_ENV: "production" }).configured).toBe(false);
  });

  it("비밀번호 비교", () => {
    expect(passwordMatches("correct-horse", "correct-horse")).toBe(true);
    expect(passwordMatches("correct-horsf", "correct-horse")).toBe(false);
    expect(passwordMatches("", "correct-horse")).toBe(false);
  });

  it("세션 토큰: 정상, 변조, 만료, 다른 키", () => {
    const now = 1_000_000;
    const t = createSessionToken(SECRET, now);
    expect(verifySessionToken(t, SECRET, now + 1000)).toBe(true);
    expect(verifySessionToken(t, SECRET, now + SESSION_TTL_SEC * 1000 + 1)).toBe(false);
    expect(verifySessionToken(t, "x".repeat(40), now + 1000)).toBe(false);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ v: 1, exp: now + 10 ** 12, n: "x" })).toString("base64url");
    expect(verifySessionToken(forged + "." + sig, SECRET, now)).toBe(false);
    expect(verifySessionToken(body + "." + sig.slice(0, -2) + "AA", SECRET, now)).toBe(false);
    expect(verifySessionToken("", SECRET)).toBe(false);
    expect(verifySessionToken("abc", SECRET)).toBe(false);
    expect(verifySessionToken(undefined, SECRET)).toBe(false);
  });

  it("쿠키 읽기·만들기", () => {
    expect(readCookie("a=1; contract_admin=tok.en; b=2", SESSION_COOKIE)).toBe("tok.en");
    expect(readCookie(null, SESSION_COOKIE)).toBeUndefined();
    expect(sessionCookie("t", true)).toMatch(/HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/);
    expect(sessionCookie("t", false)).not.toContain("Secure");
    expect(clearSessionCookie(false)).toContain("Max-Age=0");
  });

  it("isAdminRequest는 설정이 없으면 항상 false", () => {
    const cfg = getAuthConfig({ CONTRACT_ADMIN_PASSWORD: "long-enough-pw", CONTRACT_SESSION_SECRET: SECRET });
    const cookie = `${SESSION_COOKIE}=${createSessionToken(SECRET)}`;
    expect(isAdminRequest(cookie, cfg)).toBe(true);
    expect(isAdminRequest(cookie, getAuthConfig({}))).toBe(false);
    expect(isAdminRequest(null, cfg)).toBe(false);
  });
});

describe("로그인 시도 제한", () => {
  it("15분 안에 5번 실패하면 잠기고, 성공하면 초기화된다", async () => {
    const store = createMemoryStore();
    const t0 = 5_000_000;
    for (let i = 0; i < 4; i++) {
      await recordLoginFailure(store, "k", t0 + i);
      expect(await loginLockSeconds(store, "k", t0 + i)).toBe(0);
    }
    await recordLoginFailure(store, "k", t0 + 5);
    expect(await loginLockSeconds(store, "k", t0 + 6)).toBeGreaterThan(800);
    expect(await loginLockSeconds(store, "k", t0 + 16 * 60 * 1000)).toBe(0);
    await clearLoginFailures(store, "k");
    expect(await loginLockSeconds(store, "k", t0 + 6)).toBe(0);
  });

  it("창이 지난 뒤의 실패는 새로 센다", async () => {
    const store = createMemoryStore();
    await recordLoginFailure(store, "k", 0);
    await recordLoginFailure(store, "k", 16 * 60 * 1000);
    expect((await store.getAttempt("login:k"))?.count).toBe(1);
  });
});

describe("입력 정리(sanitize)", () => {
  it("알려진 필드만 통과하고 모르는 필드는 버린다", () => {
    const r = parseWorkerConfig({ type: "hourly", label: "  홍길동 ", wage: "12,000", evil: "x", ownerSig: "data:image/png;base64,AAAA", tel: "010" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ type: "hourly", label: "홍길동", wage: "12000" });
    }
  });

  it("잘못된 형식은 오류로 돌려준다", () => {
    const bad = (x: unknown) => parseWorkerConfig(x).ok;
    expect(bad({ type: "weekly" })).toBe(false);
    expect(bad({ label: "가".repeat(41) })).toBe(false);
    expect(bad({ workS: "25:00" })).toBe(false);
    expect(bad({ start: "2026-13-40" })).toBe(false);
    expect(bad({ payDay: "40" })).toBe(false);
    expect(bad({ sched: [] })).toBe(false);
    expect(bad({ allow: [{}, {}, {}, {}] })).toBe(false);
    expect(bad({ ins: { emp: "y" } })).toBe(false);
    expect(bad({ useSched: "yes" })).toBe(false);
    expect(bad(null)).toBe(false);
    expect(bad([])).toBe(false);
  });

  it("날짜는 ISO와 한국어 표기 모두 ISO로 정리한다", () => {
    const r = parseWorkerConfig({ date: "2026년 12월 1일", start: "2026-12-01", end: "" });
    expect(r.ok && r.value).toEqual({ date: "2026-12-01", start: "2026-12-01", end: "" });
  });

  it("고정수당은 3칸으로 채운다", () => {
    const r = parseWorkerConfig({ allow: [{ n: "식대", a: "100,000" }] });
    expect(r.ok && r.value.allow).toEqual([{ n: "식대", a: "100000" }, { n: "", a: "" }, { n: "", a: "" }]);
  });

  it("공통 설정: 서명은 PNG data URL만, 최저시급은 정수 범위", () => {
    expect(parseCompanySettings({ ownerSig: "data:image/svg+xml;base64,AAAA" }).ok).toBe(false);
    expect(parseCompanySettings({ ownerSig: "data:image/png;base64,AAAA" }).ok).toBe(true);
    expect(parseCompanySettings({ ownerSig: "" }).ok).toBe(true);
    expect(parseCompanySettings({ minWage: 10320 }).ok).toBe(true);
    expect(parseCompanySettings({ minWage: 12.5 }).ok).toBe(false);
    expect(parseCompanySettings({ minWage: 5 }).ok).toBe(false);
    expect(parseCompanySettings({ biz: " " }).ok).toBe(false);
  });
});

const sub = (over: Partial<SubmissionRecord> = {}): SubmissionRecord => ({
  id: "s1",
  configToken: "t1",
  configSnapshot: buildConfig(),
  name: "홍길동",
  phone: "010-1111-2222",
  address: "경기 파주시 광탄면",
  sig: "data:image/png;base64,AAAA",
  signedAt: "2026-12-01T00:00:00.000Z",
  insForm: null,
  ownerSig: null,
  countersignedAt: null,
  editedAt: null,
  ...over,
});

describe("저장소", () => {
  const dirs: string[] = [];
  afterEach(() => {
    while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  });
  const tmp = () => {
    const d = mkdtempSync(path.join(tmpdir(), "contract-store-"));
    dirs.push(d);
    return d;
  };

  for (const [name, make] of [
    ["메모리", () => createMemoryStore()],
    ["파일", () => createFileStore(tmp())],
  ] as const) {
    it(`${name}: 한 토큰에는 제출 1건만 저장된다`, async () => {
      const store = make();
      expect(await store.insertSubmission(sub())).toBe(true);
      expect(await store.insertSubmission(sub({ id: "s2" }))).toBe(false);
      expect(await store.insertSubmission(sub({ id: "s3", configToken: "t2" }))).toBe(true);
      expect((await store.listSubmissions()).length).toBe(2);
      expect((await store.getSubmissionByToken("t1"))?.id).toBe("s1");
    });

    it(`${name}: 수정은 id·토큰을 바꾸지 못하고, 삭제 후에는 다시 제출할 수 있다`, async () => {
      const store = make();
      await store.insertSubmission(sub());
      const u = await store.updateSubmission("s1", { name: "김철수", id: "hack", configToken: "hack" } as Partial<SubmissionRecord>);
      expect(u?.name).toBe("김철수");
      expect(u?.id).toBe("s1");
      expect(u?.configToken).toBe("t1");
      expect(await store.updateSubmission("none", { name: "x" })).toBeNull();
      expect(await store.deleteSubmission("s1")).toBe(true);
      expect(await store.deleteSubmission("s1")).toBe(false);
      expect(await store.insertSubmission(sub({ id: "s9" }))).toBe(true);
    });

    it(`${name}: 직원 계약 저장·조회·삭제와 공통 설정`, async () => {
      const store = make();
      await store.putConfig({ token: "a", config: { label: "가" }, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" });
      await store.putConfig({ token: "b", config: { label: "나" }, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" });
      expect((await store.listConfigs()).map((c) => c.token)).toEqual(["b", "a"]);
      expect(await store.deleteConfig("a")).toBe(true);
      expect(await store.getConfig("a")).toBeNull();
      expect(await store.getSettings()).toBeNull();
      await store.putSettings({ company: buildConfig(), minWage: 10320, updatedAt: "x" });
      expect((await store.getSettings())?.minWage).toBe(10320);
    });
  }

  it("파일: 새 인스턴스로 다시 열어도 데이터가 남아 있다", async () => {
    const dir = tmp();
    await createFileStore(dir).insertSubmission(sub());
    expect((await createFileStore(dir).getSubmission("s1"))?.name).toBe("홍길동");
  });

  it("파일: 동시에 저장해도 서로 덮어쓰지 않는다", async () => {
    const store = createFileStore(tmp());
    await Promise.all(Array.from({ length: 25 }, (_, i) => store.insertSubmission(sub({ id: "s" + i, configToken: "t" + i }))));
    expect((await store.listSubmissions()).length).toBe(25);
  });

  it("파일: 같은 토큰으로 동시에 제출해도 1건만 저장된다", async () => {
    const store = createFileStore(tmp());
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => store.insertSubmission(sub({ id: "s" + i }))));
    expect(results.filter(Boolean).length).toBe(1);
    expect((await store.listSubmissions()).length).toBe(1);
  });
});
