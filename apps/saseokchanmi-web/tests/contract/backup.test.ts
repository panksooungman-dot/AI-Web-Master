import { beforeEach, describe, expect, it } from "vitest";
import { buildConfig } from "@/lib/contract";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { buildBackup } from "@/lib/contract/server/backup";
import { addEvent, setPin } from "@/lib/contract/server/clock";
import { setStoreForTests } from "@/lib/contract/server/select";
import type { ContractStore, SubmissionRecord } from "@/lib/contract/server/store";
import { POST as login } from "@/app/api/admin/login/route";
import { GET as backupGet } from "@/app/api/admin/backup/route";

const PNG = "data:image/png;base64," + "iVBORw0KGgo".repeat(30);
const sub = (id: string, name: string): SubmissionRecord => ({
  id,
  configToken: "tok-" + id,
  configSnapshot: buildConfig(null, { type: "hourly", wage: "12000", label: "" }),
  name,
  phone: "010-1234-5678",
  address: "경기 파주시 광탄면 만장산로 1",
  sig: PNG,
  signedAt: "2026-11-14T09:00:00.000Z",
  insForm: null,
  ownerSig: PNG,
  countersignedAt: "2026-11-14T10:00:00.000Z",
  editedAt: null,
});

const NOW = new Date("2026-11-20T03:00:00.000Z");
let store: ContractStore;

beforeEach(async () => {
  store = createMemoryStore();
  setStoreForTests(store);
  process.env.CONTRACT_ADMIN_PASSWORD = "correct-horse-battery";
  process.env.CONTRACT_SESSION_SECRET = "s".repeat(40);
  delete process.env.DATABASE_URL;
  await store.putConfig({ token: "tok-a", config: { type: "hourly", wage: "12000" }, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" });
  await store.insertSubmission(sub("a", "홍길동"));
  await setPin(store, "a", "1234", NOW);
  await addEvent(store, { submissionId: "a", kind: "in", at: "2026-11-02T10:00", reason: "시험" }, NOW);
});

describe("전체 데이터 백업", () => {
  it("계약 설정·제출(서명 포함)·출퇴근 기록·정정 이력을 담고 개수를 맞춘다", async () => {
    const b = await buildBackup(store, NOW);
    expect(b).toMatchObject({ app: "saseokchanmi-contract", version: 1, exportedAt: NOW.toISOString(), counts: { configs: 1, submissions: 1, clockEvents: 1, clockAudit: 1, payslips: 0 } });
    expect(b.submissions[0]).toMatchObject({ name: "홍길동", phone: "010-1234-5678", sig: PNG, ownerSig: PNG });
    expect(b.clockEvents[0]).toMatchObject({ kind: "in", submissionId: "a" });
    expect(b.notes.length).toBeGreaterThan(0);
  });

  it("출퇴근 PIN 해시·salt와 로그인 시도 기록은 담지 않는다", async () => {
    const pin = await store.getClockPin("a");
    await store.putAttempt({ key: "admin:1.2.3.4", count: 3, firstAt: 1, lockedUntil: 0 });
    const text = JSON.stringify(await buildBackup(store, NOW));
    expect(pin?.hash).toBeTruthy();
    expect(text).not.toContain(pin!.hash);
    expect(text).not.toContain(pin!.salt);
    expect(text).not.toContain("admin:1.2.3.4");
  });

  it("API: 로그인 없이는 401, 관리자는 첨부 파일(JSON)로 받는다", async () => {
    const url = "http://localhost:4100/api/admin/backup";
    expect((await backupGet(new Request(url))).status).toBe(401);
    const res = await login(new Request("http://localhost:4100/api/admin/login", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:4100" }, body: JSON.stringify({ password: "correct-horse-battery" }) }));
    const cookie = res.headers.get("set-cookie")!.split(";")[0];
    const ok = await backupGet(new Request(url, { headers: { cookie } }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-disposition")).toMatch(/^attachment; filename="saseokchanmi-backup-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(await ok.text())).toMatchObject({ app: "saseokchanmi-contract", counts: { submissions: 1 } });
  });
});
