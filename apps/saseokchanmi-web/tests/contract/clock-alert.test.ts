import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildConfig } from "@/lib/contract";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { addEvent } from "@/lib/contract/server/clock";
import { buildMissingMessage, missingCheckouts, runMissingCheckoutAlert } from "@/lib/contract/server/clock-alert";
import { setStoreForTests } from "@/lib/contract/server/select";
import type { ContractStore, SubmissionRecord } from "@/lib/contract/server/store";
import { GET as cronGet } from "@/app/api/cron/clock-missing/route";

const PNG = "data:image/png;base64," + "iVBORw0KGgo".repeat(30);
const sub = (id: string, name: string, confirmed = true): SubmissionRecord => ({
  id,
  configToken: "tok-" + id,
  configSnapshot: buildConfig(null, { type: "hourly", wage: "12000", label: "" }),
  name,
  phone: "010-1234-5678",
  address: "경기 파주시",
  sig: PNG,
  signedAt: "2026-11-01T09:00:00.000Z",
  insForm: null,
  ownerSig: confirmed ? PNG : null,
  countersignedAt: confirmed ? "2026-11-01T10:00:00.000Z" : null,
  editedAt: null,
});

// 한국 시간 2026-11-15 09:00 (cron이 도는 시각)
const NOW = new Date("2026-11-15T00:00:00.000Z");
const SLACK = { SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/X" };
let store: ContractStore;

beforeEach(async () => {
  store = createMemoryStore();
  setStoreForTests(store);
  await store.insertSubmission(sub("a", "홍길동"));
  await store.insertSubmission(sub("b", "김철수"));
  await store.insertSubmission(sub("c", "이영희"));
  await store.insertSubmission(sub("d", "박민수", false)); // 사업주 서명 대기
  const at = (id: string, kind: "in" | "out", local: string) => addEvent(store, { submissionId: id, kind, at: local, reason: "시험" }, new Date("2026-11-15T01:00:00.000Z"));
  await at("a", "in", "2026-11-14T10:00"); // 어제 출근, 퇴근 없음 → 누락
  await at("b", "in", "2026-11-14T10:00");
  await at("b", "out", "2026-11-14T18:00"); // 정상
  await at("c", "in", "2026-11-14T23:00"); // 10시간 전 출근(야간) → 아직 누락 아님
});

describe("퇴근 누락 알림", () => {
  it("마지막 기록이 출근이고 16시간이 지난 확정 직원만 찾는다", async () => {
    expect((await missingCheckouts(store, NOW)).map((m) => m.name)).toEqual(["홍길동"]);
  });

  it("메시지에는 이름·출근 시각·정정 안내가 들어가고, 이름의 멘션·서식 문자는 제거되며 길면 줄인다", () => {
    const text = buildMissingMessage([{ id: "a", name: "<!channel>*홍*", since: "2026-11-14T01:00:00.000Z" }], "https://x.test/admin/clock");
    expect(text).toContain("1명");
    expect(text).toContain("(11/14 10:00 출근)");
    expect(text).not.toMatch(/[<>*]/);
    expect(text).toContain("정정");
    const many = buildMissingMessage(Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: `직원${i}`, since: "2026-11-14T01:00:00.000Z" })));
    expect(many).toContain("12명");
    expect(many).toContain("외 2명");
  });

  it("누락이 있으면 Slack으로 보내고, 없으면 아무것도 보내지 않는다", async () => {
    const f = vi.fn(async () => new Response("ok"));
    const r = await runMissingCheckoutAlert(store, SLACK, NOW, f as unknown as typeof fetch);
    expect(r).toEqual({ count: 1, sent: [{ channel: "slack", ok: true }] });
    const text = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)).text as string;
    expect(text).toContain("홍길동");
    expect(text).not.toContain("010-1234-5678");

    await addEvent(store, { submissionId: "a", kind: "out", at: "2026-11-14T19:00", reason: "정정" }, NOW);
    f.mockClear();
    expect(await runMissingCheckoutAlert(store, SLACK, NOW, f as unknown as typeof fetch)).toEqual({ count: 0, sent: [] });
    expect(f).not.toHaveBeenCalled();
  });
});

describe("cron 라우트", () => {
  const req = (auth?: string) => new Request("http://localhost:4100/api/cron/clock-missing", { headers: auth ? { authorization: auth } : {} });
  beforeEach(() => {
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.SOLAPI_API_KEY;
  });

  it("CRON_SECRET이 없으면 503, 틀리거나 없으면 401, 맞으면 200", async () => {
    delete process.env.CRON_SECRET;
    expect((await cronGet(req("Bearer anything"))).status).toBe(503);
    process.env.CRON_SECRET = "c".repeat(32);
    expect((await cronGet(req())).status).toBe(401);
    expect((await cronGet(req("Bearer wrong"))).status).toBe(401);
    const ok = await cronGet(req(`Bearer ${"c".repeat(32)}`));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true });
    delete process.env.CRON_SECRET;
  });
});
