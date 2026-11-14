import { afterAll, describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/contract/server/backends";
import { createSqlStore, SCHEMA, type Row } from "@/lib/contract/server/sql-store";
import { storeSuite } from "./store-suite";

storeSuite("메모리", async () => createMemoryStore());

/**
 * 실제 Postgres에 대한 시험. TEST_DATABASE_URL(시험 전용 빈 DB)과 `pg` 패키지가 있을 때만 돈다.
 * 예: TEST_DATABASE_URL=postgres://localhost/contract_test npm test
 * 시험마다 테이블을 새로 만들기 때문에 운영 DB를 가리키면 안 된다.
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("ContractStore — Postgres (실제 DB)", () => {
  let pool: { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }>; end: () => Promise<void> } | null = null;
  const connect = async () => {
    if (pool) return pool;
    const pkg = "pg";
    const { Pool } = (await import(/* @vite-ignore */ pkg)).default as { Pool: new (o: { connectionString: string }) => NonNullable<typeof pool> };
    pool = new Pool({ connectionString: url! });
    return pool;
  };
  afterAll(async () => {
    await pool?.end();
  });

  storeSuite("Postgres", async () => {
    const p = await connect();
    // 시험마다 깨끗한 상태에서 시작한다.
    await p.query("DROP TABLE IF EXISTS contract_config, company_settings, contract_submission, login_attempt");
    return createSqlStore(async (text, params) => (await p.query(text, params)).rows);
  });

  it("스키마는 여러 번(그리고 동시에) 만들어도 안전하다", async () => {
    const p = await connect();
    const run = async (text: string, params?: unknown[]) => (await p.query(text, params)).rows;
    await p.query("DROP TABLE IF EXISTS contract_config, company_settings, contract_submission, login_attempt");
    await Promise.all([createSqlStore(run).listConfigs(), createSqlStore(run).listConfigs(), createSqlStore(run).getSettings()]);
    for (const ddl of SCHEMA) await run(ddl);
    expect(await createSqlStore(run).listSubmissions()).toEqual([]);
  });
});
