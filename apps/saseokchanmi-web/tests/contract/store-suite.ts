import { beforeEach, describe, expect, it } from "vitest";
import { buildConfig } from "@/lib/contract";
import type { ContractStore, SubmissionRecord } from "@/lib/contract/server/store";

/**
 * ContractStore 구현이 지켜야 하는 동작. 메모리 저장소와 Postgres 저장소에 같은 시험을 적용해
 * 둘이 똑같이 동작하는지 확인한다.
 */
const PNG = "data:image/png;base64," + "iVBORw0KGgo".repeat(30);

const sub = (over: Partial<SubmissionRecord> = {}): SubmissionRecord => ({
  id: "sub-1",
  configToken: "tok-1",
  configSnapshot: buildConfig(null, { type: "hourly", wage: "12000", label: "" }),
  name: "홍길동",
  phone: "010-1234-5678",
  address: "경기 파주시 광탄면 만장산로 1",
  sig: PNG,
  signedAt: "2026-11-14T09:00:00.000Z",
  insForm: null,
  ownerSig: null,
  countersignedAt: null,
  editedAt: null,
  ...over,
});

export function storeSuite(name: string, make: () => Promise<ContractStore>) {
  describe(`ContractStore — ${name}`, () => {
    let store: ContractStore;
    beforeEach(async () => {
      store = await make();
    });

    it("직원 계약: 저장·조회·수정(같은 토큰은 덮어쓰기)·목록(최신순)·삭제", async () => {
      expect(await store.getConfig("nope")).toBeNull();
      await store.putConfig({ token: "a", config: { label: "가", wage: "11000" }, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" });
      await store.putConfig({ token: "b", config: { label: "나", ins: { emp: "y", acc: "y", pen: "n", hlt: "n" } }, createdAt: "2026-11-02T00:00:00.000Z", updatedAt: "2026-11-02T00:00:00.000Z" });
      expect((await store.listConfigs()).map((c) => c.token)).toEqual(["b", "a"]);
      expect((await store.getConfig("b"))?.config.ins).toEqual({ emp: "y", acc: "y", pen: "n", hlt: "n" });
      await store.putConfig({ token: "a", config: { label: "가", wage: "12000" }, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-03T00:00:00.000Z" });
      expect((await store.getConfig("a"))?.config.wage).toBe("12000");
      expect(await store.listConfigs()).toHaveLength(2);
      expect(await store.deleteConfig("a")).toBe(true);
      expect(await store.deleteConfig("a")).toBe(false);
      expect(await store.getConfig("a")).toBeNull();
    });

    it("공통 설정: 없으면 null, 저장하면 같은 값, 다시 저장하면 교체", async () => {
      expect(await store.getSettings()).toBeNull();
      const rec = { company: { biz: "사색찬미한정식", owner: "황명분", tel: "031-945-8004", addr: "경기 파주시", ownerSig: PNG, watermark: true }, minWage: 10320, updatedAt: "2026-11-14T00:00:00.000Z" };
      await store.putSettings(rec);
      expect(await store.getSettings()).toEqual(rec);
      await store.putSettings({ ...rec, minWage: 11000, company: { ...rec.company, ownerSig: "" } });
      const next = await store.getSettings();
      expect(next?.minWage).toBe(11000);
      expect(next?.company.ownerSig).toBe("");
    });

    it("제출: 저장하면 스냅샷·서명·사유서가 그대로 돌아온다", async () => {
      const ins = { r: { pen: "1", hlt: "1" }, other: "", birth: "900101", detail: "주 12시간", c: [true, true, true] };
      expect(await store.insertSubmission(sub({ insForm: ins }))).toBe(true);
      const got = await store.getSubmission("sub-1");
      expect(got).toEqual(sub({ insForm: ins }));
      expect(await store.getSubmissionByToken("tok-1")).toEqual(got);
      expect(await store.getSubmission("nope")).toBeNull();
      expect(await store.getSubmissionByToken("nope")).toBeNull();
    });

    it("한 직원 계약(토큰)에는 제출 1건만: 두 번째와 동시 제출은 거부", async () => {
      expect(await store.insertSubmission(sub())).toBe(true);
      expect(await store.insertSubmission(sub({ id: "sub-2" }))).toBe(false);
      const results = await Promise.all([store.insertSubmission(sub({ id: "x1", configToken: "tok-9" })), store.insertSubmission(sub({ id: "x2", configToken: "tok-9" }))]);
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await store.listSubmissions()).toHaveLength(2);
    });

    it("제출 목록은 최근 제출이 먼저", async () => {
      await store.insertSubmission(sub({ id: "old", configToken: "t-old", signedAt: "2026-11-01T00:00:00.000Z" }));
      await store.insertSubmission(sub({ id: "new", configToken: "t-new", signedAt: "2026-11-10T00:00:00.000Z" }));
      expect((await store.listSubmissions()).map((s) => s.id)).toEqual(["new", "old"]);
    });

    it("제출 수정: 보낸 항목만 바뀌고 id·토큰은 못 바꾼다, 없는 건 null", async () => {
      await store.insertSubmission(sub());
      const next = await store.updateSubmission("sub-1", { name: "홍길순", editedAt: "2026-11-15T00:00:00.000Z", id: "hacked", configToken: "hacked" } as Partial<SubmissionRecord>);
      expect(next).toMatchObject({ id: "sub-1", configToken: "tok-1", name: "홍길순", phone: "010-1234-5678", sig: PNG, editedAt: "2026-11-15T00:00:00.000Z" });
      const signed = await store.updateSubmission("sub-1", { ownerSig: PNG, countersignedAt: "2026-11-16T00:00:00.000Z" });
      expect(signed).toMatchObject({ ownerSig: PNG, countersignedAt: "2026-11-16T00:00:00.000Z", name: "홍길순" });
      expect(await store.updateSubmission("sub-1", {})).toMatchObject({ name: "홍길순" });
      expect(await store.updateSubmission("nope", { name: "x" })).toBeNull();
    });

    it("계약 설정을 지워도 제출 건은 남는다. 제출 삭제는 한 번만 성공", async () => {
      await store.putConfig({ token: "tok-1", config: {}, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" });
      await store.insertSubmission(sub());
      await store.deleteConfig("tok-1");
      expect(await store.getSubmission("sub-1")).not.toBeNull();
      expect(await store.deleteSubmission("sub-1")).toBe(true);
      expect(await store.deleteSubmission("sub-1")).toBe(false);
    });

    it("출퇴근 PIN: 저장·덮어쓰기·목록·삭제", async () => {
      expect(await store.getClockPin("s1")).toBeNull();
      await store.putClockPin({ submissionId: "s1", hash: "aa", salt: "bb", updatedAt: "2026-11-15T00:00:00.000Z" });
      await store.putClockPin({ submissionId: "s2", hash: "cc", salt: "dd", updatedAt: "2026-11-15T00:00:00.000Z" });
      await store.putClockPin({ submissionId: "s1", hash: "ee", salt: "ff", updatedAt: "2026-11-16T00:00:00.000Z" });
      expect(await store.getClockPin("s1")).toEqual({ submissionId: "s1", hash: "ee", salt: "ff", updatedAt: "2026-11-16T00:00:00.000Z" });
      expect((await store.listClockPins()).map((p) => p.submissionId).sort()).toEqual(["s1", "s2"]);
      expect(await store.deleteClockPin("s1")).toBe(true);
      expect(await store.deleteClockPin("s1")).toBe(false);
    });

    it("출퇴근 기록: 시간순 목록·기간/직원 조건·직원별 마지막 기록", async () => {
      const ev = (id: string, submissionId: string, kind: "in" | "out", at: string) => ({ id, submissionId, kind, at, source: "device" as const, note: "" });
      await store.insertClockEvent(ev("e2", "s1", "out", "2026-11-15T09:00:00.000Z"));
      await store.insertClockEvent(ev("e1", "s1", "in", "2026-11-15T01:00:00.000Z"));
      await store.insertClockEvent(ev("e3", "s2", "in", "2026-11-15T02:00:00.000Z"));
      expect((await store.listClockEvents()).map((e) => e.id)).toEqual(["e1", "e3", "e2"]);
      expect((await store.listClockEvents({ submissionId: "s1" })).map((e) => e.id)).toEqual(["e1", "e2"]);
      expect((await store.listClockEvents({ from: "2026-11-15T02:00:00.000Z", to: "2026-11-15T09:00:00.000Z" })).map((e) => e.id)).toEqual(["e3"]);
      const last = await store.lastClockEvents();
      expect(last.s1).toMatchObject({ id: "e2", kind: "out", source: "device", note: "" });
      expect(last.s2).toMatchObject({ id: "e3", kind: "in" });
    });

    it("출퇴근 기록 수정·삭제와 정정 이력", async () => {
      await store.insertClockEvent({ id: "e1", submissionId: "s1", kind: "in", at: "2026-11-15T01:00:00.000Z", source: "device", note: "" });
      expect(await store.getClockEvent("nope")).toBeNull();
      expect(await store.getClockEvent("e1")).toMatchObject({ kind: "in", source: "device" });
      const upd = await store.updateClockEvent("e1", { at: "2026-11-15T00:30:00.000Z", source: "admin", note: "정정" });
      expect(upd).toEqual({ id: "e1", submissionId: "s1", kind: "in", at: "2026-11-15T00:30:00.000Z", source: "admin", note: "정정" });
      expect(await store.updateClockEvent("e1", {})).toMatchObject({ at: "2026-11-15T00:30:00.000Z" });
      expect(await store.updateClockEvent("nope", { kind: "out" })).toBeNull();
      expect(await store.deleteClockEvent("e1")).toBe(true);
      expect(await store.deleteClockEvent("e1")).toBe(false);

      const a = (id: string, at: string, submissionId = "s1") => ({ id, eventId: "e1", submissionId, action: "edit" as const, before: { kind: "in" as const, at: "x" }, after: { kind: "out" as const, at: "y" }, reason: "사유", at });
      await store.insertClockAudit({ ...a("a2", "2026-11-16T00:00:00.000Z"), action: "delete", after: null });
      await store.insertClockAudit({ ...a("a1", "2026-11-15T00:00:00.000Z"), action: "add", before: null });
      await store.insertClockAudit(a("a3", "2026-11-17T00:00:00.000Z", "s2"));
      expect((await store.listClockAudit()).map((x) => x.id)).toEqual(["a1", "a2", "a3"]);
      expect((await store.listClockAudit({ submissionId: "s1" })).map((x) => x.id)).toEqual(["a1", "a2"]);
      expect((await store.listClockAudit({ from: "2026-11-16T00:00:00.000Z", to: "2026-11-17T00:00:00.000Z" })).map((x) => x.id)).toEqual(["a2"]);
      expect(await store.listClockAudit({ submissionId: "s1" })).toMatchObject([{ action: "add", before: null, after: { kind: "out" } }, { action: "delete", before: { kind: "in" }, after: null }]);
    });

    it("로그인 시도 기록: 저장·덮어쓰기·삭제, 큰 숫자(밀리초 시각)도 숫자로 돌아온다", async () => {
      expect(await store.getAttempt("login:k")).toBeNull();
      const a = { key: "login:k", count: 3, firstAt: 1_763_100_000_000, lockedUntil: 0 };
      await store.putAttempt(a);
      expect(await store.getAttempt("login:k")).toEqual(a);
      await store.putAttempt({ ...a, count: 5, lockedUntil: 1_763_100_900_000 });
      expect(await store.getAttempt("login:k")).toEqual({ ...a, count: 5, lockedUntil: 1_763_100_900_000 });
      await store.clearAttempt("login:k");
      expect(await store.getAttempt("login:k")).toBeNull();
    });
  });
}
