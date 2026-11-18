import { describe, expect, it, vi } from "vitest";
import { ALIMTALK, alimtalkMissing, clipVar, mobileOf, renderAlimtalk, sendAlimtalk } from "@/lib/contract/server/alimtalk";
import { kakaoPeople, runMissingCheckoutAlert } from "@/lib/contract/server/clock-alert";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { addEvent } from "@/lib/contract/server/clock";
import { buildConfig } from "@/lib/contract";
import type { SubmissionRecord } from "@/lib/contract/server/store";

const ENV = {
  SOLAPI_API_KEY: "k",
  SOLAPI_API_SECRET: "s",
  SOLAPI_FROM: "02-123-4567",
  SOLAPI_TO: "010-9999-8888",
  SOLAPI_KAKAO_PFID: "KA01PF",
  SOLAPI_TPL_CONTRACT: "KA01TP-contract",
  SOLAPI_TPL_PAYSLIP: "KA01TP-payslip",
  SOLAPI_TPL_MISSING: "KA01TP-missing",
};
const okFetch = () => vi.fn(async () => new Response(JSON.stringify({ groupInfo: { count: { total: 1, registeredFailed: 0 } } }), { status: 200 }));

describe("알림톡 도우미", () => {
  it("휴대전화만 받고 숫자로 정리한다", () => {
    expect(mobileOf("010-1234-5678")).toBe("01012345678");
    expect(mobileOf("02-123-4567")).toBeNull();
    expect(mobileOf("")).toBeNull();
  });

  it("변수는 40자로 줄이고, 문구에는 변수만 채운다", () => {
    expect(clipVar("가".repeat(50))).toHaveLength(40);
    expect(clipVar("짧다")).toBe("짧다");
    const text = renderAlimtalk("payslip", { 이름: "홍길동", 귀속월: "2026년 11월", 지급일: "2026-12-05" });
    expect(text).toContain("홍길동님, 2026년 11월 급여명세서가 확정되었습니다.");
    expect(text).not.toContain("#{");
  });

  it("템플릿 문구의 변수는 모두 보낼 때 채우는 이름과 같다(템플릿이 어긋나면 카카오가 거부한다)", () => {
    const vars = (k: keyof typeof ALIMTALK) => [...ALIMTALK[k].body.matchAll(/#\{([^}]+)\}/g)].map((m) => m[1]).sort();
    expect(vars("contract")).toEqual(["이름"]);
    expect(vars("payslip")).toEqual(["귀속월", "이름", "지급일"]);
    expect(vars("missing")).toEqual(["인원", "직원"]);
  });

  it("설정이 비어 있으면 보내지 않고 비어 있는 이름을 알려 준다", async () => {
    expect(alimtalkMissing("contract", {})).toContain("SOLAPI_KAKAO_PFID");
    expect(alimtalkMissing("contract", ENV)).toEqual([]);
    const fetchFn = okFetch();
    const r = await sendAlimtalk("contract", { to: "01012345678", vars: { 이름: "홍" }, link: "https://x" }, { ...ENV, SOLAPI_TPL_CONTRACT: "" }, fetchFn);
    expect(r).toMatchObject({ ok: false, skipped: true });
    expect(r.error).toContain("SOLAPI_TPL_CONTRACT");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("잘못된 번호는 보내지 않는다", async () => {
    const fetchFn = okFetch();
    const r = await sendAlimtalk("contract", { to: "123", vars: { 이름: "홍" }, link: "https://x" }, ENV, fetchFn);
    expect(r.ok).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("SOLAPI 알림톡 요청 형식: ATA, 발신프로필·템플릿 ID, #{변수}, 웹링크 버튼, 문자 대체 없음", async () => {
    const fetchFn = okFetch();
    const r = await sendAlimtalk("contract", { to: "010-1234-5678", vars: { 이름: "홍길동" }, link: "https://saseokchanmi.com/contract/tok" }, ENV, fetchFn);
    expect(r).toEqual({ channel: "kakao", ok: true });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, { body: string; headers: Record<string, string> }];
    expect(url).toBe("https://api.solapi.com/messages/v4/send-many/detail");
    expect(init.headers.authorization).toMatch(/^HMAC-SHA256 apiKey=k, date=.*, salt=.*, signature=[0-9a-f]{64}$/);
    const m = JSON.parse(init.body).messages[0];
    expect(m).toMatchObject({ to: "01012345678", from: "021234567", type: "ATA" });
    expect(m.kakaoOptions).toEqual({
      pfId: "KA01PF",
      templateId: "KA01TP-contract",
      variables: { "#{이름}": "홍길동" },
      disableSms: true,
      buttons: [{ buttonType: "WL", buttonName: "계약서 작성하기", linkMo: "https://saseokchanmi.com/contract/tok", linkPc: "https://saseokchanmi.com/contract/tok" }],
    });
  });

  it("접수 전체가 실패하거나 HTTP 오류면 실패로 돌려준다", async () => {
    const bad = vi.fn(async () => new Response(JSON.stringify({ groupInfo: { count: { total: 1, registeredFailed: 1 } } }), { status: 200 }));
    expect((await sendAlimtalk("contract", { to: "01012345678", vars: { 이름: "홍" }, link: "https://x" }, ENV, bad)).ok).toBe(false);
    const http = vi.fn(async () => new Response("no", { status: 401 }));
    expect((await sendAlimtalk("contract", { to: "01012345678", vars: { 이름: "홍" }, link: "https://x" }, ENV, http)).error).toBe("HTTP 401");
  });
});

describe("퇴근 누락 알림톡", () => {
  it("직원 요약은 40자 안에 들어간다", () => {
    const m = (name: string) => ({ id: name, name, since: "2026-11-14T01:00:00.000Z" });
    expect(kakaoPeople([m("홍길동")])).toBe("홍길동");
    expect(kakaoPeople([m("홍길동"), m("김철수")])).toBe("홍길동, 김철수");
    const many = kakaoPeople(Array.from({ length: 30 }, (_, i) => m(`직원이름${i}`)));
    expect(many.length).toBeLessThanOrEqual(40);
    expect(many).toMatch(/ 외 \d+명$/);
  });

  const NOW = new Date("2026-11-15T00:00:00.000Z");
  const sub = (id: string, name: string): SubmissionRecord => ({
    id,
    configToken: "tok-" + id,
    configSnapshot: buildConfig(null, { type: "hourly", wage: "12000", label: "" }),
    name,
    phone: "010-1234-5678",
    address: "경기 파주시",
    sig: "data:image/png;base64," + "iVBORw0KGgo".repeat(30),
    signedAt: "2026-11-01T09:00:00.000Z",
    insForm: null,
    ownerSig: "data:image/png;base64," + "iVBORw0KGgo".repeat(30),
    countersignedAt: "2026-11-01T10:00:00.000Z",
    editedAt: null,
  });

  it("알림톡 설정이 있으면 문자와 별도로 알림톡도 보내고, 없으면 건너뛴다", async () => {
    const store = createMemoryStore();
    await store.insertSubmission(sub("a", "홍길동"));
    await addEvent(store, { submissionId: "a", kind: "in", at: "2026-11-14T10:00", reason: "시험" }, new Date("2026-11-15T01:00:00.000Z"));

    const withKakao = okFetch();
    const r = await runMissingCheckoutAlert(store, ENV, NOW, withKakao);
    expect(r.count).toBe(1);
    expect(r.sent.map((s) => s.channel).sort()).toEqual(["kakao", "solapi"]);
    const kakaoCall = withKakao.mock.calls.map((c) => JSON.parse((c[1] as { body: string }).body).messages[0]).find((m) => m.type === "ATA");
    expect(kakaoCall.kakaoOptions.variables).toEqual({ "#{인원}": "1", "#{직원}": "홍길동" });
    expect(kakaoCall.to).toBe("01099998888");

    const noKakao = okFetch();
    const { SOLAPI_KAKAO_PFID: _omit, ...rest } = ENV;
    void _omit;
    const r2 = await runMissingCheckoutAlert(store, rest, NOW, noKakao);
    expect(r2.sent.map((s) => s.channel)).toEqual(["solapi"]);
  });
});
