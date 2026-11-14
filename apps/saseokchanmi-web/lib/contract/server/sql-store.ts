import type { ConfigRecord, ContractStore, LoginAttempt, SettingsRecord, SubmissionRecord } from "./store";

/**
 * Postgres(Neon) 저장소. 드라이버에 묶이지 않도록 "SQL 한 줄 실행기"만 받는다
 * (운영: Neon HTTP 드라이버, 테스트: node-postgres). 데이터는 파일/메모리 저장소와 같은 모양이고,
 * 시각은 ISO 문자열 그대로 text로 저장해 변환 오류가 없게 한다.
 * 근로자 제출은 계약 설정(config_token) 하나에 1건만 들어가며, 설정을 지워도 제출 건은 남는다(외래키 없음).
 */

export type Row = Record<string, unknown>;
export type SqlRunner = (text: string, params?: unknown[]) => Promise<Row[]>;

/** 테이블 생성문(여러 번 실행해도 안전). 첫 요청 때 자동으로 만들어 별도 마이그레이션이 필요 없다. */
export const SCHEMA: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS contract_config (
    token text PRIMARY KEY,
    config jsonb NOT NULL,
    created_at text NOT NULL,
    updated_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS company_settings (
    id integer PRIMARY KEY CHECK (id = 1),
    company jsonb NOT NULL,
    min_wage integer NOT NULL,
    updated_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS contract_submission (
    id text PRIMARY KEY,
    config_token text NOT NULL UNIQUE,
    config_snapshot jsonb NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    sig text NOT NULL,
    signed_at text NOT NULL,
    ins_form jsonb,
    owner_sig text,
    countersigned_at text,
    edited_at text
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempt (
    key text PRIMARY KEY,
    count integer NOT NULL,
    first_at bigint NOT NULL,
    locked_until bigint NOT NULL
  )`,
];

const json = (v: unknown): string => JSON.stringify(v);
/** 드라이버에 따라 jsonb가 문자열로 올 수 있어 방어적으로 푼다. */
const parse = <T>(v: unknown): T => (typeof v === "string" ? (JSON.parse(v) as T) : (v as T));
const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

const toConfig = (r: Row): ConfigRecord => ({
  token: String(r.token),
  config: parse(r.config),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

const toSubmission = (r: Row): SubmissionRecord => ({
  id: String(r.id),
  configToken: String(r.config_token),
  configSnapshot: parse(r.config_snapshot),
  name: String(r.name),
  phone: String(r.phone),
  address: String(r.address),
  sig: String(r.sig),
  signedAt: String(r.signed_at),
  insForm: r.ins_form === null || r.ins_form === undefined ? null : parse(r.ins_form),
  ownerSig: str(r.owner_sig),
  countersignedAt: str(r.countersigned_at),
  editedAt: str(r.edited_at),
});

/** updateSubmission에서 바꿀 수 있는 항목 → [컬럼, jsonb 여부]. id·configToken은 바꾸지 않는다(파일 저장소와 동일). */
const PATCHABLE: Record<string, readonly [string, boolean]> = {
  configSnapshot: ["config_snapshot", true],
  name: ["name", false],
  phone: ["phone", false],
  address: ["address", false],
  sig: ["sig", false],
  signedAt: ["signed_at", false],
  insForm: ["ins_form", true],
  ownerSig: ["owner_sig", false],
  countersignedAt: ["countersigned_at", false],
  editedAt: ["edited_at", false],
};

export function createSqlStore(run: SqlRunner): ContractStore {
  let ready: Promise<void> | null = null;

  const ensureSchema = async () => {
    for (const ddl of SCHEMA) {
      try {
        await run(ddl);
      } catch (e) {
        // 서버가 동시에 처음 뜰 때 CREATE TABLE IF NOT EXISTS끼리 부딪히는 경우는 무시한다. 늦게 온 쪽은 먼저 온 쪽이
        // 테이블을 확정(commit)할 때까지 기다렸다가 "이미 있음" 오류를 받으므로, 이 오류 뒤에는 테이블이 이미 있다.
        // (실제 Postgres로 시험해서 확인한 코드: 42710 duplicate_object, 42P07 duplicate_table, 23505 unique_violation)
        const code = (e as { code?: string }).code;
        if (code !== "42710" && code !== "42P07" && code !== "23505") throw e;
      }
    }
  };
  /** 첫 호출에서 테이블을 만든다. 실패하면 다음 요청에서 다시 시도한다. */
  const q = async (text: string, params?: unknown[]): Promise<Row[]> => {
    ready ??= ensureSchema().catch((e) => {
      ready = null;
      throw e;
    });
    await ready;
    return run(text, params);
  };

  return {
    listConfigs: async () => (await q("SELECT * FROM contract_config ORDER BY created_at DESC")).map(toConfig),
    getConfig: async (token) => {
      const rows = await q("SELECT * FROM contract_config WHERE token = $1", [token]);
      return rows[0] ? toConfig(rows[0]) : null;
    },
    putConfig: async (rec) => {
      await q(
        `INSERT INTO contract_config (token, config, created_at, updated_at) VALUES ($1, $2::jsonb, $3, $4)
         ON CONFLICT (token) DO UPDATE SET config = EXCLUDED.config, created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at`,
        [rec.token, json(rec.config), rec.createdAt, rec.updatedAt],
      );
    },
    deleteConfig: async (token) => (await q("DELETE FROM contract_config WHERE token = $1 RETURNING token", [token])).length > 0,

    getSettings: async () => {
      const rows = await q("SELECT * FROM company_settings WHERE id = 1");
      const r = rows[0];
      return r ? ({ company: parse(r.company), minWage: Number(r.min_wage), updatedAt: String(r.updated_at) } satisfies SettingsRecord) : null;
    },
    putSettings: async (rec) => {
      await q(
        `INSERT INTO company_settings (id, company, min_wage, updated_at) VALUES (1, $1::jsonb, $2, $3)
         ON CONFLICT (id) DO UPDATE SET company = EXCLUDED.company, min_wage = EXCLUDED.min_wage, updated_at = EXCLUDED.updated_at`,
        [json(rec.company), rec.minWage, rec.updatedAt],
      );
    },

    listSubmissions: async () => (await q("SELECT * FROM contract_submission ORDER BY signed_at DESC")).map(toSubmission),
    getSubmission: async (id) => {
      const rows = await q("SELECT * FROM contract_submission WHERE id = $1", [id]);
      return rows[0] ? toSubmission(rows[0]) : null;
    },
    getSubmissionByToken: async (token) => {
      const rows = await q("SELECT * FROM contract_submission WHERE config_token = $1", [token]);
      return rows[0] ? toSubmission(rows[0]) : null;
    },
    // config_token 유일 제약 덕분에 두 요청이 동시에 들어와도 한 건만 들어간다(나머지는 false).
    insertSubmission: async (rec) =>
      (
        await q(
          `INSERT INTO contract_submission
             (id, config_token, config_snapshot, name, phone, address, sig, signed_at, ins_form, owner_sig, countersigned_at, edited_at)
           VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12)
           ON CONFLICT DO NOTHING RETURNING id`,
          [
            rec.id,
            rec.configToken,
            json(rec.configSnapshot),
            rec.name,
            rec.phone,
            rec.address,
            rec.sig,
            rec.signedAt,
            rec.insForm === null ? null : json(rec.insForm),
            rec.ownerSig,
            rec.countersignedAt,
            rec.editedAt,
          ],
        )
      ).length > 0,
    updateSubmission: async (id, patch) => {
      const sets: string[] = [];
      const params: unknown[] = [id];
      for (const [key, [col, isJson]] of Object.entries(PATCHABLE)) {
        const v = (patch as Record<string, unknown>)[key];
        if (v === undefined) continue;
        params.push(v === null ? null : isJson ? json(v) : v);
        sets.push(`${col} = $${params.length}${isJson ? "::jsonb" : ""}`);
      }
      const rows = sets.length
        ? await q(`UPDATE contract_submission SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, params)
        : await q("SELECT * FROM contract_submission WHERE id = $1", [id]);
      return rows[0] ? toSubmission(rows[0]) : null;
    },
    deleteSubmission: async (id) => (await q("DELETE FROM contract_submission WHERE id = $1 RETURNING id", [id])).length > 0,

    getAttempt: async (key) => {
      const r = (await q("SELECT * FROM login_attempt WHERE key = $1", [key]))[0];
      // bigint는 드라이버에 따라 문자열로 오므로 숫자로 바꾼다.
      return r ? ({ key: String(r.key), count: Number(r.count), firstAt: Number(r.first_at), lockedUntil: Number(r.locked_until) } satisfies LoginAttempt) : null;
    },
    putAttempt: async (a) => {
      await q(
        `INSERT INTO login_attempt (key, count, first_at, locked_until) VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE SET count = EXCLUDED.count, first_at = EXCLUDED.first_at, locked_until = EXCLUDED.locked_until`,
        [a.key, a.count, a.firstAt, a.lockedUntil],
      );
    },
    clearAttempt: async (key) => {
      await q("DELETE FROM login_attempt WHERE key = $1", [key]);
    },
  };
}
