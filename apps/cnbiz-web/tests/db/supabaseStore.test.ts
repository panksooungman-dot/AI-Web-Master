import { beforeEach, describe, expect, it, vi } from "vitest";

interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
}

interface FakeBuilder extends PromiseLike<QueryResult> {
  select: (...args: unknown[]) => FakeBuilder;
  delete: (...args: unknown[]) => FakeBuilder;
  upsert: (...args: unknown[]) => FakeBuilder;
  eq: (...args: unknown[]) => FakeBuilder;
  not: (...args: unknown[]) => FakeBuilder;
  maybeSingle: (...args: unknown[]) => FakeBuilder;
}

interface RecordedCall {
  method: string;
  args: unknown[];
}

const calls: RecordedCall[] = [];
const resultQueue: QueryResult[] = [];

function makeBuilder(): FakeBuilder {
  const builder = {} as FakeBuilder;

  const chain =
    (method: string) =>
    (...args: unknown[]): FakeBuilder => {
      calls.push({ method, args });
      return builder;
    };

  builder.select = chain("select");
  builder.delete = chain("delete");
  builder.upsert = chain("upsert");
  builder.eq = chain("eq");
  builder.not = chain("not");
  builder.maybeSingle = chain("maybeSingle");
  builder.then = <TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> => {
    const result = resultQueue.shift() ?? { data: null, error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  };

  return builder;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => makeBuilder()),
  })),
}));

const { createSupabaseStore } = await import("../../lib/db/supabaseStore");

describe("supabaseStore.replaceAll — lib/db/supabaseStore.ts", () => {
  beforeEach(() => {
    calls.length = 0;
    resultQueue.length = 0;
  });

  it("upserts the new/updated rows before deleting stale ones (no delete-then-insert gap)", async () => {
    resultQueue.push({ error: null }); // upsert result
    resultQueue.push({ error: null }); // delete result

    const store = createSupabaseStore("https://example.test", "service-key");
    await store.replaceAll("widgets", [{ id: "a" }, { id: "b" }]);

    const methods = calls.map((c) => c.method);
    const upsertIndex = methods.indexOf("upsert");
    const deleteIndex = methods.indexOf("delete");

    expect(upsertIndex).toBeGreaterThanOrEqual(0);
    expect(deleteIndex).toBeGreaterThan(upsertIndex);

    const notCall = calls.find((c) => c.method === "not");
    expect(notCall?.args).toEqual(["id", "in", '("a","b")']);
  });

  it("deletes every row for the collection (no upsert, no keep-list) when records is empty", async () => {
    resultQueue.push({ error: null }); // delete result

    const store = createSupabaseStore("https://example.test", "service-key");
    await store.replaceAll("widgets", []);

    expect(calls.some((c) => c.method === "upsert")).toBe(false);
    expect(calls.some((c) => c.method === "not")).toBe(false);
    expect(calls.some((c) => c.method === "delete")).toBe(true);
  });

  it("throws when the upsert step fails and never attempts the delete", async () => {
    resultQueue.push({ error: { message: "upsert boom" } });

    const store = createSupabaseStore("https://example.test", "service-key");
    await expect(store.replaceAll("widgets", [{ id: "a" }])).rejects.toThrow(/upsert failed/);

    expect(calls.some((c) => c.method === "delete")).toBe(false);
  });

  it("throws when the delete step fails", async () => {
    resultQueue.push({ error: null }); // upsert result
    resultQueue.push({ error: { message: "delete boom" } }); // delete result

    const store = createSupabaseStore("https://example.test", "service-key");
    await expect(store.replaceAll("widgets", [{ id: "a" }])).rejects.toThrow(/delete failed/);
  });
});

/**
 * 2026-08-26 실사용에서 재현된 버그: lib/inquiries/notify.ts가 Promise.all()로 email/Slack/
 * SOLAPI 3개 채널의 recordAuditEvent()(list→push→replaceAll)를 동시에 호출했을 때, 실제
 * 네트워크 요청이 있어 늦게 끝나는 SOLAPI 채널의 Audit Log 기록이 사라졌다 —
 * replaceAll()이 "upsert(내 스냅샷) → 내 스냅샷에 없는 행 삭제" 방식이라, 서로 다른 호출이
 * 각자 오래된 스냅샷을 기준으로 delete를 실행하면서 상대방이 이미 upsert한 행을 지워버린 것.
 * lib/db/collectionLock.ts의 collection 단위 락(원래 fsStore.ts에만 있었음)을
 * supabaseStore.ts에도 적용해 수정했다 — 아래는 실제 Supabase REST 응답 지연을 흉내 낸 가짜
 * 클라이언트(테이블 상태를 진짜로 보관·반영)로 그 수정을 검증한다.
 */
describe("supabaseStore concurrency — collection-level lock prevents lost writes (2026-08-26 SOLAPI audit log 유실 재현)", () => {
  function makeStatefulClient(latencies: Record<string, number>) {
    const table = new Map<string, { collection: string; id: string; data: unknown }>();

    function delayFor(collection: string): number {
      return latencies[collection] ?? 0;
    }

    function wait(ms: number): Promise<void> {
      return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
    }

    return {
      from() {
        let mode: "select" | "upsert" | "delete" = "select";
        let eqCollection: string | undefined;
        let eqId: string | undefined;
        let notIds: string[] | undefined;
        let upsertRows: Array<{ collection: string; id: string; data: unknown }> = [];

        const builder = {
          select() {
            mode = "select";
            return builder;
          },
          upsert(rows: Array<{ collection: string; id: string; data: unknown }>) {
            mode = "upsert";
            upsertRows = rows;
            return builder;
          },
          delete() {
            mode = "delete";
            return builder;
          },
          eq(field: string, value: string) {
            if (field === "collection") eqCollection = value;
            if (field === "id") eqId = value;
            return builder;
          },
          not(_field: string, _op: string, value: string) {
            notIds = value
              .slice(1, -1)
              .split(",")
              .map((s) => s.replace(/^"|"$/g, ""));
            return builder;
          },
          maybeSingle() {
            return builder;
          },
          then<TResult1 = unknown, TResult2 = never>(
            onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
            onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
          ): PromiseLike<TResult1 | TResult2> {
            const run = async () => {
              await wait(delayFor(eqCollection ?? ""));

              if (mode === "select" && eqId !== undefined) {
                const row = table.get(`${eqCollection}:${eqId}`);
                return { data: row ? { data: row.data } : null, error: null };
              }
              if (mode === "select") {
                const rows = [...table.values()].filter((r) => r.collection === eqCollection);
                return { data: rows.map((r) => ({ data: r.data })), error: null };
              }
              if (mode === "upsert") {
                for (const row of upsertRows) {
                  table.set(`${row.collection}:${row.id}`, row);
                }
                return { error: null };
              }
              // delete
              for (const [key, row] of table) {
                if (row.collection !== eqCollection) continue;
                if (eqId !== undefined && row.id !== eqId) continue;
                if (notIds && notIds.includes(row.id)) continue;
                table.delete(key);
              }
              return { error: null };
            };
            return run().then(onfulfilled, onrejected);
          },
        };

        return builder;
      },
      table,
    };
  }

  it("3 concurrent recordAuditEvent-shape writes (list→push→replaceAll) with staggered latency (email/Slack fast, SOLAPI slow) lose 0 entries", async () => {
    // email/Slack 채널처럼 env-var 미설정으로 즉시 실패하는 경로는 거의 지연이 없고, SOLAPI처럼
    // 실제 fetch()까지 가는 경로는 뚜렷하게 늦게 끝난다 — 실제로 관측된 타이밍 차이를 재현.
    const client = makeStatefulClient({ "audit-log": 0 });
    vi.mocked((await import("@supabase/supabase-js")).createClient).mockReturnValueOnce(client as never);

    const store = createSupabaseStore("https://example.test", "service-key");

    async function writeOne(id: string, artificialDelayMs: number): Promise<void> {
      const entries = await store.list<{ id: string; label: string }>("audit-log");
      // list() 완료 이후, replaceAll() 호출 이전에 시간이 걸리는 상황(SOLAPI의 실제 네트워크
      // 요청)을 흉내 — 이 지연 동안 다른 두 호출이 먼저 replaceAll()을 끝낼 수 있다.
      if (artificialDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, artificialDelayMs));
      }
      entries.push({ id, label: `entry-${id}` });
      await store.replaceAll("audit-log", entries);
    }

    // email/Slack은 거의 즉시(0ms), SOLAPI는 실제 네트워크 왕복만큼 늦게(20ms) — 버그가
    // 재현됐던 실제 타이밍 관계와 동일하게 구성.
    await Promise.all([writeOne("email", 0), writeOne("slack", 0), writeOne("solapi", 20)]);

    const finalEntries = await store.list<{ id: string; label: string }>("audit-log");
    const ids = finalEntries.map((e) => e.id).sort();
    expect(ids).toEqual(["email", "slack", "solapi"]); // 셋 다 유실 없이 전부 남아있어야 한다
  });

  it("without the lock this exact scenario would lose the slow writer's entry (documents the bug this test guards against)", async () => {
    // 락 없이 raw upsert-then-delete-stale 시맨틱만으로 같은 시나리오를 재현 — 회귀 감지용으로,
    // 이 테스트 자체가 실패하면(즉 유실이 재현되지 않으면) 위 수정 검증 테스트의 전제가 깨진
    // 것이므로 같이 확인한다.
    const client = makeStatefulClient({ "audit-log": 0 });

    async function rawReplaceAllNoLock(
      list: () => Promise<Array<{ id: string; label: string }>>,
      replaceAll: (records: Array<{ id: string; label: string }>) => Promise<void>,
      id: string,
      artificialDelayMs: number
    ): Promise<void> {
      const entries = await list();
      if (artificialDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, artificialDelayMs));
      }
      entries.push({ id, label: `entry-${id}` });
      await replaceAll(entries);
    }

    const list = async () => {
      const res = await client.from().select().eq("collection", "audit-log");
      return ((res as { data: Array<{ data: { id: string; label: string } }> }).data ?? []).map((r) => r.data);
    };
    const replaceAll = async (records: Array<{ id: string; label: string }>) => {
      if (records.length > 0) {
        await client
          .from()
          .upsert(records.map((r) => ({ collection: "audit-log", id: r.id, data: r })))
          .eq("collection", "audit-log");
      }
      await client
        .from()
        .delete()
        .eq("collection", "audit-log")
        .not(
          "id",
          "in",
          `(${records.map((r) => `"${r.id}"`).join(",")})`
        );
    };

    await Promise.all([
      rawReplaceAllNoLock(list, replaceAll, "email", 0),
      rawReplaceAllNoLock(list, replaceAll, "slack", 0),
      rawReplaceAllNoLock(list, replaceAll, "solapi", 20),
    ]);

    const finalIds = [...client.table.values()].map((r) => r.id).sort();
    // 락이 없으면 실제로 유실이 재현된다 — 3개 전부 남아있지 않다.
    expect(finalIds.length).toBeLessThan(3);
  });
});
