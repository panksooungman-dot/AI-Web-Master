import { createSqlStore, type Row } from "./sql-store";
import type { ContractStore } from "./store";

/**
 * Neon Postgres 저장소. 서버리스 환경에서 연결을 오래 붙들지 않도록 HTTP 방식 드라이버를 쓴다
 * (요청마다 한 번 HTTP로 질의). 드라이버는 처음 쓸 때 불러온다.
 */
export function createNeonStore(databaseUrl: string): ContractStore {
  let sql: { query: (text: string, params?: unknown[]) => Promise<unknown> } | null = null;
  return createSqlStore(async (text, params) => {
    if (!sql) {
      const { neon } = await import("@neondatabase/serverless");
      sql = neon(databaseUrl);
    }
    return (await sql.query(text, params ?? [])) as Row[];
  });
}
