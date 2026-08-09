import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { DesignPlanRecord } from "./types";
import type {
  DatabaseDesignContent,
  DatabaseIndex,
  DatabaseRelationship,
  DatabaseTable,
  RelationshipType,
  RlsPolicy,
} from "./database-design";

const RELATIONSHIP_TYPES: RelationshipType[] = ["one-to-many", "many-to-many", "one-to-one"];

const SYSTEM_PROMPT =
  "You are a senior database architect for AI Business OS's Design Automation system. Given a " +
  "project's Requirement Analysis, Feature List, and Screen List, design the database schema it " +
  "needs. Produce a single JSON object (no prose, no markdown fences) with exactly these keys: " +
  "tables, relationships, indexes, rlsPolicies, migrationNotes. Every relationship `type` must be " +
  "one of exactly: " +
  RELATIONSHIP_TYPES.join(", ") +
  ". Column `type` values should be generic SQL-ish types (uuid, text, integer, boolean, " +
  "timestamptz, jsonb), not tied to one specific database product. Do not invent tables the " +
  "project's features don't need — a marketing site with no user accounts doesn't need a users " +
  "table. Every rlsPolicies entry describes row-level security intent in plain language, not SQL.";

function buildUserPrompt(plan: DesignPlanRecord): string {
  return `Project: ${plan.input.projectName} (${plan.input.projectType})
Requirement Analysis:
${JSON.stringify(plan.content.requirementAnalysis)}

Feature List:
${JSON.stringify(plan.content.featureList)}

Screen List:
${JSON.stringify(plan.content.screenList)}

Return ONLY a JSON object shaped like:
{
  "tables": [{
    "name": string, "description": string, "primaryKey": string,
    "columns": [{ "name": string, "type": string, "nullable": boolean, "description": string }]
  }],
  "relationships": [{ "from": string, "to": string, "type": string, "description": string }],
  "indexes": [{ "table": string, "columns": string[], "reason": string }],
  "rlsPolicies": [{ "table": string, "description": string }],
  "migrationNotes": string (한국어 2~3문장, 마이그레이션 시 주의할 점)
}`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRelationshipType(value: unknown): value is RelationshipType {
  return typeof value === "string" && (RELATIONSHIP_TYPES as string[]).includes(value);
}

function isDatabaseColumn(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const col = value as Record<string, unknown>;
  return (
    isNonEmptyString(col.name) &&
    isNonEmptyString(col.type) &&
    typeof col.nullable === "boolean" &&
    typeof col.description === "string"
  );
}

function isDatabaseTable(value: unknown): value is DatabaseTable {
  if (typeof value !== "object" || value === null) return false;
  const table = value as Record<string, unknown>;
  return (
    isNonEmptyString(table.name) &&
    typeof table.description === "string" &&
    isNonEmptyString(table.primaryKey) &&
    Array.isArray(table.columns) &&
    table.columns.length > 0 &&
    table.columns.every(isDatabaseColumn)
  );
}

function isDatabaseRelationship(value: unknown): value is DatabaseRelationship {
  if (typeof value !== "object" || value === null) return false;
  const rel = value as Record<string, unknown>;
  return (
    isNonEmptyString(rel.from) &&
    isNonEmptyString(rel.to) &&
    isRelationshipType(rel.type) &&
    typeof rel.description === "string"
  );
}

function isDatabaseIndex(value: unknown): value is DatabaseIndex {
  if (typeof value !== "object" || value === null) return false;
  const idx = value as Record<string, unknown>;
  return (
    isNonEmptyString(idx.table) &&
    Array.isArray(idx.columns) &&
    idx.columns.length > 0 &&
    idx.columns.every((c) => typeof c === "string") &&
    typeof idx.reason === "string"
  );
}

function isRlsPolicy(value: unknown): value is RlsPolicy {
  if (typeof value !== "object" || value === null) return false;
  const policy = value as Record<string, unknown>;
  return isNonEmptyString(policy.table) && typeof policy.description === "string";
}

/**
 * AI 응답을 DatabaseDesignContent로 파싱한다. 하나라도 어긋나면 null을 반환해 호출자가 결정론적
 * 기본값으로 폴백하도록 한다(lib/design/prototype-generator.ts의 parsePrototypeContent()와
 * 동일한 all-or-nothing 원칙).
 */
export function parseDatabaseDesignContent(raw: string): DatabaseDesignContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.tables) || obj.tables.length === 0 || !obj.tables.every(isDatabaseTable)) return null;
  if (!Array.isArray(obj.relationships) || !obj.relationships.every(isDatabaseRelationship)) return null;
  if (!Array.isArray(obj.indexes) || !obj.indexes.every(isDatabaseIndex)) return null;
  if (!Array.isArray(obj.rlsPolicies) || !obj.rlsPolicies.every(isRlsPolicy)) return null;
  if (!isNonEmptyString(obj.migrationNotes)) return null;

  return {
    tables: obj.tables,
    relationships: obj.relationships,
    indexes: obj.indexes,
    rlsPolicies: obj.rlsPolicies,
    migrationNotes: obj.migrationNotes,
  };
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "_")
      .replace(/^_+|_+$/g, "") || "item"
  );
}

/**
 * Design Plan만으로 항상 유효한 Database Design을 만드는 결정론적 폴백 — Provider 미설정이거나
 * 응답 파싱에 실패해도 빈 스키마가 되지 않는다(lib/design/prototype-generator.ts의
 * buildDefaultPrototype()과 동일한 역할). Feature List의 각 기능 하나당 최소한의 테이블 하나를
 * 대응시키는 단순한 규칙이다 — 실제 스키마 설계를 대체하지 않는, "항상 동작하는" 안전망.
 */
export function buildDefaultDatabaseDesign(plan: DesignPlanRecord): DatabaseDesignContent {
  const featureTables: DatabaseTable[] = plan.content.featureList.map((feature) => ({
    name: slugify(feature.name),
    description: feature.description,
    primaryKey: "id",
    columns: [
      { name: "id", type: "uuid", nullable: false, description: "기본 키" },
      { name: "created_at", type: "timestamptz", nullable: false, description: "생성 시각" },
      { name: "title", type: "text", nullable: false, description: `${feature.name} 관련 주요 텍스트` },
    ],
  }));

  const usersTable: DatabaseTable = {
    name: "users",
    description: "서비스 이용자 계정 정보",
    primaryKey: "id",
    columns: [
      { name: "id", type: "uuid", nullable: false, description: "기본 키" },
      { name: "email", type: "text", nullable: false, description: "로그인 이메일" },
      { name: "created_at", type: "timestamptz", nullable: false, description: "가입 시각" },
    ],
  };

  const tables = [usersTable, ...featureTables];

  const relationships: DatabaseRelationship[] = featureTables.map((table) => ({
    from: "users",
    to: table.name,
    type: "one-to-many",
    description: `한 사용자가 여러 ${table.description || table.name}을(를) 가질 수 있다.`,
  }));

  const indexes: DatabaseIndex[] = [
    { table: "users", columns: ["email"], reason: "이메일로 로그인 조회를 빠르게 하기 위함" },
  ];

  const rlsPolicies: RlsPolicy[] = tables.map((table) => ({
    table: table.name,
    description: `${table.name} 테이블은 소유자 본인만 조회·수정할 수 있다.`,
  }));

  return {
    tables,
    relationships,
    indexes,
    rlsPolicies,
    migrationNotes: "AI Provider 미설정으로 생성된 기본 스키마입니다. 실제 도입 전 요구사항에 맞춰 재검토가 필요합니다.",
  };
}

export interface GenerateDatabaseDesignResult {
  content: DatabaseDesignContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn`은 기본값이 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다(Phase 1~9와 동일한 DI 패턴).
 */
export async function generateDatabaseDesign(
  plan: DesignPlanRecord,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateDatabaseDesignResult> {
  const result = await chatFn(buildUserPrompt(plan), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parseDatabaseDesignContent(result.content);
    if (parsed) {
      return { content: parsed, simulated: false, provider: result.provider, model: result.model };
    }
  }

  return { content: buildDefaultDatabaseDesign(plan), simulated: true };
}
