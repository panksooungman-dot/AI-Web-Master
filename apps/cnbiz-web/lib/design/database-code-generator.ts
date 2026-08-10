import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type {
  DatabaseColumn,
  DatabaseDesignRecord,
  DatabaseIndex,
  DatabaseRelationship,
  DatabaseTable,
  RlsPolicy,
} from "./database-design";
import type { DatabaseCodeContent, GeneratedMigrationFile } from "./database-code";

/** RLS Policy 배치 크기 — 테이블당 보통 1개씩이라 Backend Design/Code보다 훨씬 여유 있게 잡는다. */
const RLS_BATCH_SIZE = 10;

const RLS_SYSTEM_PROMPT =
  "You are a senior database security engineer for AI Business OS's Design Automation system. " +
  "You are given ONE SLICE of a larger project's Row-Level-Security policy descriptions (natural-" +
  "language, plus each referenced table's column list) — write the ACTUAL Supabase Postgres RLS " +
  "SQL for JUST the policies in this slice. For each policy, emit `ALTER TABLE \"<table>\" ENABLE " +
  "ROW LEVEL SECURITY;` followed by one or more `CREATE POLICY` statements implementing the " +
  "description, using `auth.uid()` for the current authenticated user's id matched against " +
  "whichever column in that table's given column list plausibly represents ownership (e.g. " +
  "user_id, owner_id, patient_id). If no ownership column can be inferred from the given columns, " +
  'emit `USING (true)` with a `-- ` comment noting the policy allows all authenticated access and ' +
  "needs manual review — never guess a column name that isn't in the given list. Return ONLY a " +
  'JSON object (no prose, no markdown fences) shaped like: {"policies": [{"table": string, ' +
  '"description": string, "sql": string}]} where `description` is copied verbatim from the input ' +
  "so the caller can match it back, and `sql` contains only SQL statements (no prose).";

function buildRlsBatchPrompt(policies: RlsPolicy[], tables: DatabaseTable[]): string {
  const context = policies.map((policy) => ({
    table: policy.table,
    description: policy.description,
    columns: tables.find((t) => t.name === policy.table)?.columns.map((c) => c.name) ?? [],
  }));

  return `RLS Policy Descriptions (write SQL for exactly these ${policies.length} policies):
${JSON.stringify(context)}

Return ONLY a JSON object shaped like:
{ "policies": [{ "table": string, "description": string, "sql": string }] }`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

interface ParsedRlsPolicy {
  table: string;
  description: string;
  sql: string;
}

/** 실제 SQL 파서 없이도 걸러낼 수 있는 구조적 이상 신호 — CREATE POLICY 존재 여부만 확인한다
 *  (토큰 상한에 걸려 응답이 중간에 잘린 경우 이 키워드 자체가 없거나 불완전하므로 유용하다). */
function looksLikeRlsSql(sql: unknown): sql is string {
  return typeof sql === "string" && sql.trim().length > 0 && /create\s+policy/i.test(sql);
}

export function parseRlsBatch(raw: string): ParsedRlsPolicy[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.policies) || obj.policies.length === 0) return null;

  const policies: ParsedRlsPolicy[] = [];
  for (const item of obj.policies) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    if (!isNonEmptyString(entry.table) || !isNonEmptyString(entry.description)) continue;
    if (!looksLikeRlsSql(entry.sql)) continue;
    policies.push({ table: entry.table, description: entry.description, sql: entry.sql });
  }

  return policies.length > 0 ? policies : null;
}

// ---------------------------------------------------------------------------
// Deterministic DDL — tables/relationships/indexes need no AI: every value is
// already structured data. Mirrors packages/cli's React Generator in spirit
// (structured data -> deterministic code) and this app's api-code-generator.ts.
// ---------------------------------------------------------------------------

const TYPE_ALIASES: Record<string, string> = {
  string: "text",
  str: "text",
  int: "integer",
  int4: "integer",
  bigint: "bigint",
  bool: "boolean",
  datetime: "timestamptz",
  date: "date",
  float: "numeric",
  number: "numeric",
  double: "double precision",
  json: "jsonb",
};

function toPostgresType(type: string): string {
  const normalized = type.trim().toLowerCase();
  return TYPE_ALIASES[normalized] ?? normalized;
}

function buildColumnDDL(column: DatabaseColumn, isPrimaryKey: boolean): string {
  const pgType = toPostgresType(column.type);
  const parts = [`  "${column.name}" ${pgType}`];

  if (isPrimaryKey) {
    parts.push("PRIMARY KEY");
    if (pgType === "uuid") parts.push("DEFAULT gen_random_uuid()");
  } else if (!column.nullable) {
    parts.push("NOT NULL");
  }

  return parts.join(" ");
}

export function buildCreateTableSQL(table: DatabaseTable): string {
  const lines = table.columns.map((col) => buildColumnDDL(col, col.name === table.primaryKey));
  const comment = table.description ? `-- ${table.description}\n` : "";
  return `${comment}CREATE TABLE IF NOT EXISTS "${table.name}" (\n${lines.join(",\n")}\n);`;
}

function singularize(value: string): string {
  return value.endsWith("s") && value.length > 1 ? value.slice(0, -1) : value;
}

function findForeignKeyColumn(childTable: DatabaseTable, parentTableName: string): DatabaseColumn | undefined {
  const candidates = new Set([`${singularize(parentTableName)}_id`, `${parentTableName}_id`]);
  return childTable.columns.find((col) => candidates.has(col.name));
}

function buildManyToManyJoinTableSQL(rel: DatabaseRelationship, fromTable: DatabaseTable, toTable: DatabaseTable): string {
  const joinTableName = `${fromTable.name}_${toTable.name}`;
  const fromCol = `${singularize(fromTable.name)}_id`;
  const toCol = `${singularize(toTable.name)}_id`;

  return [
    `-- ${rel.description || `${rel.from} <-> ${rel.to} many-to-many 조인 테이블`}`,
    `CREATE TABLE IF NOT EXISTS "${joinTableName}" (`,
    `  "${fromCol}" uuid NOT NULL REFERENCES "${fromTable.name}" ("${fromTable.primaryKey}"),`,
    `  "${toCol}" uuid NOT NULL REFERENCES "${toTable.name}" ("${toTable.primaryKey}"),`,
    `  PRIMARY KEY ("${fromCol}", "${toCol}")`,
    `);`,
  ].join("\n");
}

/**
 * 관계 하나를 SQL로 번역한다 — many-to-many는 조인 테이블을 새로 만들고(항상 성공),
 * one-to-many/one-to-one은 자식 테이블에서 그럴듯한 외래 키 컬럼(예: "user_id")을 찾아
 * `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`를 발행한다. 대상 테이블을 못 찾거나
 * 외래 키 컬럼을 추정할 수 없으면(존재하지 않는 컬럼명을 지어내는 대신) SQL 대신 사람이
 * 읽는 TODO 주석만 남긴다 — 틀린 컬럼명으로 깨지는 마이그레이션보다 안전하다.
 */
export function buildRelationshipSQL(rel: DatabaseRelationship, tables: DatabaseTable[]): string {
  const fromTable = tables.find((t) => t.name === rel.from);
  const toTable = tables.find((t) => t.name === rel.to);

  if (!fromTable || !toTable) {
    return `-- TODO: 관계 "${rel.from} -> ${rel.to}"(${rel.type})의 테이블을 찾을 수 없어 자동으로 처리하지 못했습니다. 수동으로 확인하세요.`;
  }

  if (rel.type === "many-to-many") {
    return buildManyToManyJoinTableSQL(rel, fromTable, toTable);
  }

  const fkColumn = findForeignKeyColumn(toTable, fromTable.name);
  if (!fkColumn) {
    return `-- TODO: 관계 "${rel.from} -> ${rel.to}"(${rel.type})에 대응하는 외래 키 컬럼을 "${toTable.name}"에서 찾지 못했습니다. 컬럼을 추가하고 수동으로 제약을 연결하세요.`;
  }

  const constraintName = `fk_${toTable.name}_${fkColumn.name}`;
  const fk = `ALTER TABLE "${toTable.name}" ADD CONSTRAINT ${constraintName} FOREIGN KEY ("${fkColumn.name}") REFERENCES "${fromTable.name}" ("${fromTable.primaryKey}");`;

  if (rel.type !== "one-to-one") return fk;

  const uniqueConstraint = `ALTER TABLE "${toTable.name}" ADD CONSTRAINT uq_${toTable.name}_${fkColumn.name} UNIQUE ("${fkColumn.name}");`;
  return `${fk}\n${uniqueConstraint}`;
}

export function buildIndexSQL(index: DatabaseIndex): string {
  const indexName = `idx_${index.table}_${index.columns.join("_")}`;
  const cols = index.columns.map((c) => `"${c}"`).join(", ");
  const comment = index.reason ? `-- ${index.reason}\n` : "";
  return `${comment}CREATE INDEX IF NOT EXISTS "${indexName}" ON "${index.table}" (${cols});`;
}

/**
 * RLS Policy 하나에 대한 결정론적 기본값 — AI 미사용/실패 시, 틀린 접근 제어 규칙을 지어내는
 * 대신 항상 허용하는 정책 + 명확한 TODO 주석을 남긴다(과도하게 제한적인 잘못된 정책이 앱을
 * 깨뜨리는 것보다, 허용적 기본값 + 수동 검토 요구가 더 안전하다는 판단 — backend-code-generator
 * 의 buildDefaultFunctionCode()와 동일한 안전 우선 원칙).
 */
export function buildDefaultRlsSQL(policy: RlsPolicy): string {
  return [
    `-- ${policy.description}`,
    "-- TODO: 아래는 AI 미사용/실패로 생성된 허용적 기본 정책입니다 — 실제 접근 제어 규칙으로 반드시 교체하세요.",
    `ALTER TABLE "${policy.table}" ENABLE ROW LEVEL SECURITY;`,
    `CREATE POLICY "${policy.table}_default_access" ON "${policy.table}" FOR ALL USING (true) WITH CHECK (true);`,
  ].join("\n");
}

function policyKey(table: string, description: string): string {
  return `${table}::${description}`;
}

function buildMigrationFile(database: DatabaseDesignRecord, rlsSqlByKey: Map<string, string>): GeneratedMigrationFile {
  const sections: string[] = [
    "-- Migration generated from Database Design (AI Business OS Design Automation)",
    `-- ${database.content.migrationNotes}`,
    "",
    "-- Tables",
    ...database.content.tables.map(buildCreateTableSQL),
    "",
    "-- Relationships",
    ...database.content.relationships.map((rel) => buildRelationshipSQL(rel, database.content.tables)),
    "",
    "-- Indexes",
    ...database.content.indexes.map(buildIndexSQL),
    "",
    "-- Row Level Security",
    ...database.content.rlsPolicies.map(
      (policy) => rlsSqlByKey.get(policyKey(policy.table, policy.description)) ?? buildDefaultRlsSQL(policy)
    ),
  ];

  return { path: "supabase/migrations/0001_initial_schema.sql", code: `${sections.join("\n\n")}\n` };
}

export interface GenerateDatabaseCodeResult {
  content: DatabaseCodeContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

type ChatFn = (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult>;

interface RlsBatchOutcome {
  sqlByKey: Map<string, string>;
  usedFallback: boolean;
  provider?: string;
  model?: string;
}

async function generateRlsBatch(policies: RlsPolicy[], tables: DatabaseTable[], chatFn: ChatFn): Promise<RlsBatchOutcome> {
  const result = await chatFn(buildRlsBatchPrompt(policies, tables), { system: RLS_SYSTEM_PROMPT });
  const sqlByKey = new Map<string, string>();

  if (result.success && result.content) {
    const parsed = parseRlsBatch(result.content);
    if (parsed) {
      for (const item of parsed) {
        sqlByKey.set(policyKey(item.table, item.description), item.sql);
      }
    }
  }

  let usedFallback = false;
  for (const policy of policies) {
    if (!sqlByKey.has(policyKey(policy.table, policy.description))) {
      usedFallback = true;
      sqlByKey.set(policyKey(policy.table, policy.description), buildDefaultRlsSQL(policy));
    }
  }

  return {
    sqlByKey,
    usedFallback,
    provider: result.success ? result.provider : undefined,
    model: result.success ? result.model : undefined,
  };
}

const FULLY_DEFAULT_NOTES =
  "AI Provider 미설정으로 RLS 정책이 모두 허용적 기본값(FOR ALL USING (true))으로 생성되었습니다 — 실제 배포 전 반드시 교체하세요.";
const PARTIALLY_DEFAULT_NOTES =
  "일부 RLS 정책은 AI 응답 실패로 허용적 기본값(FOR ALL USING (true))으로 생성되었습니다 — 실제 배포 전 반드시 교체하세요.";
const FULLY_AI_NOTES = "Table/Relationship/Index는 결정론적으로, RLS 정책은 AI로 생성되었습니다. 실제 배포 전 정책을 검토하세요.";

/**
 * Database Design만으로 항상 유효한(실행 가능한) 마이그레이션을 만드는 결정론적 폴백 —
 * Table/Relationship/Index DDL은 항상 결정론적으로 생성되고, RLS만 허용적 기본 정책으로
 * 폴백된다. `generateDatabaseCode()`의 모든 배치가 폴백된 경우와 동일한 `notes` 문구를 사용해,
 * "모든 배치 실패 시 이 함수의 결과와 완전히 동일하다"는 불변식을 유지한다.
 */
export function buildDefaultDatabaseCode(database: DatabaseDesignRecord): DatabaseCodeContent {
  const rlsSqlByKey = new Map<string, string>();
  return {
    files: [buildMigrationFile(database, rlsSqlByKey)],
    notes: FULLY_DEFAULT_NOTES,
  };
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 허용 정책 폴백 — Database Design의 RLS
 * Policy를 RLS_BATCH_SIZE 단위로 나눈 배치마다 독립적으로 이뤄진다(병렬 실행). Table/
 * Relationship/Index DDL은 AI 호출 없이 항상 결정론적으로 생성된다. `chatFn`은 기본값이 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다.
 */
export async function generateDatabaseCode(
  database: DatabaseDesignRecord,
  chatFn: ChatFn = chatViaCli
): Promise<GenerateDatabaseCodeResult> {
  const batches: RlsPolicy[][] = [];
  for (let i = 0; i < database.content.rlsPolicies.length; i += RLS_BATCH_SIZE) {
    batches.push(database.content.rlsPolicies.slice(i, i + RLS_BATCH_SIZE));
  }

  const outcomes = await Promise.all(batches.map((batch) => generateRlsBatch(batch, database.content.tables, chatFn)));

  const rlsSqlByKey = new Map<string, string>();
  for (const outcome of outcomes) {
    for (const [key, sql] of outcome.sqlByKey) {
      rlsSqlByKey.set(key, sql);
    }
  }

  const simulated = outcomes.some((o) => o.usedFallback);
  const firstSuccess = outcomes.find((o) => !o.usedFallback && o.provider);
  const notes = !simulated ? FULLY_AI_NOTES : firstSuccess ? PARTIALLY_DEFAULT_NOTES : FULLY_DEFAULT_NOTES;

  return {
    content: {
      files: [buildMigrationFile(database, rlsSqlByKey)],
      notes,
    },
    simulated,
    provider: firstSuccess?.provider,
    model: firstSuccess?.model,
  };
}
