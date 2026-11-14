import { describe, expect, it, vi } from "vitest";

const calls: Array<{ url: string; text: string; params: unknown[] }> = [];
vi.mock("@neondatabase/serverless", () => ({
  neon: (url: string) => ({
    query: async (text: string, params: unknown[]) => {
      calls.push({ url, text, params });
      return [];
    },
  }),
}));

import { createNeonStore } from "@/lib/contract/server/neon";

describe("createNeonStore", () => {
  it("Neon 드라이버는 첫 질의 때 불러오고, 테이블을 먼저 만든 뒤 질의를 같은 연결 문자열로 보낸다", async () => {
    const store = createNeonStore("postgres://u:p@host/db?sslmode=require");
    expect(calls).toHaveLength(0); // 만들기만 해서는 연결하지 않는다

    expect(await store.getConfig("abc")).toBeNull();
    const ddl = calls.filter((c) => c.text.startsWith("CREATE TABLE IF NOT EXISTS"));
    expect(ddl).toHaveLength(4);
    const last = calls[calls.length - 1];
    expect(last).toMatchObject({ url: "postgres://u:p@host/db?sslmode=require", params: ["abc"] });
    expect(last.text).toContain("FROM contract_config WHERE token = $1");

    // 같은 저장소의 다음 질의에서는 테이블을 다시 만들지 않는다.
    const before = calls.length;
    await store.getSettings();
    expect(calls.length - before).toBe(1);
  });
});
