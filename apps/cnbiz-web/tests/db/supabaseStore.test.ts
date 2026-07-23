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
