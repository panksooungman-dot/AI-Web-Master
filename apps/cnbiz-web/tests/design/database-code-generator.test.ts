import { describe, expect, it } from "vitest";
import {
  buildCreateTableSQL,
  buildDefaultDatabaseCode,
  buildDefaultRlsSQL,
  buildIndexSQL,
  buildRelationshipSQL,
  generateDatabaseCode,
  parseRlsBatch,
} from "../../lib/design/database-code-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DatabaseDesignRecord, DatabaseTable } from "../../lib/design/database-design";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { ChatResult } from "../../lib/ai/bridge";

const PLAN_INPUT: DesignPlanInput = {
  projectName: "Bright Smile Dental",
  projectType: "치과 웹사이트",
  requirements: "온라인 예약, 진료 안내, 오시는 길 안내가 필요합니다.",
  targetUsers: "지역 주민, 30~50대",
};

const PLAN: DesignPlanRecord = {
  id: "design-plan-1",
  input: PLAN_INPUT,
  content: buildDefaultDesignPlan(PLAN_INPUT),
  simulated: true,
  createdAt: new Date().toISOString(),
};

// buildDefaultDatabaseDesign() produces: users + one table per feature (4 features -> 5 tables),
// one-to-many relationships from users to each feature table, one index, and one RLS policy per
// table (5 total) -> single batch at RLS_BATCH_SIZE=10.
const DATABASE_DESIGN: DatabaseDesignRecord = {
  id: "database-design-1",
  planId: PLAN.id,
  version: 1,
  content: buildDefaultDatabaseDesign(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

function fakeRlsSqlFor(table: string): string {
  return `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "${table}_owner_access" ON "${table}" FOR ALL USING (auth.uid() = user_id);`;
}

function buildFullAiContent() {
  return {
    policies: DATABASE_DESIGN.content.rlsPolicies.map((p) => ({
      table: p.table,
      description: p.description,
      sql: fakeRlsSqlFor(p.table),
    })),
  };
}

describe("Database Code Generator — buildCreateTableSQL() (deterministic DDL)", () => {
  it("emits a CREATE TABLE with every column, using the primaryKey column as PRIMARY KEY", () => {
    const table = DATABASE_DESIGN.content.tables[0];
    const sql = buildCreateTableSQL(table);

    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "${table.name}"`);
    for (const column of table.columns) {
      expect(sql).toContain(`"${column.name}"`);
    }
    expect(sql).toContain(`"${table.primaryKey}"`);
    expect(sql).toMatch(new RegExp(`"${table.primaryKey}"[^,]*PRIMARY KEY`));
  });

  it("adds DEFAULT gen_random_uuid() only for uuid-typed primary keys", () => {
    const uuidTable: DatabaseTable = {
      name: "widgets",
      description: "",
      primaryKey: "id",
      columns: [{ name: "id", type: "uuid", nullable: false, description: "" }],
    };
    const textPkTable: DatabaseTable = {
      name: "codes",
      description: "",
      primaryKey: "code",
      columns: [{ name: "code", type: "text", nullable: false, description: "" }],
    };

    expect(buildCreateTableSQL(uuidTable)).toContain("DEFAULT gen_random_uuid()");
    expect(buildCreateTableSQL(textPkTable)).not.toContain("DEFAULT gen_random_uuid()");
  });

  it("adds NOT NULL for non-nullable non-primary-key columns, omits it for nullable ones", () => {
    const table: DatabaseTable = {
      name: "items",
      description: "",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid", nullable: false, description: "" },
        { name: "required_field", type: "text", nullable: false, description: "" },
        { name: "optional_field", type: "text", nullable: true, description: "" },
      ],
    };
    const sql = buildCreateTableSQL(table);
    expect(sql).toMatch(/"required_field" text NOT NULL/);
    expect(sql).not.toMatch(/"optional_field" text NOT NULL/);
  });
});

describe("Database Code Generator — buildRelationshipSQL() (deterministic FK)", () => {
  const usersTable: DatabaseTable = {
    name: "users",
    description: "",
    primaryKey: "id",
    columns: [{ name: "id", type: "uuid", nullable: false, description: "" }],
  };

  it("emits a FOREIGN KEY constraint when a matching '<singular>_id' column exists on the child table", () => {
    const reservationsTable: DatabaseTable = {
      name: "reservations",
      description: "",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid", nullable: false, description: "" },
        { name: "user_id", type: "uuid", nullable: false, description: "" },
      ],
    };
    const sql = buildRelationshipSQL(
      { from: "users", to: "reservations", type: "one-to-many", description: "" },
      [usersTable, reservationsTable]
    );
    expect(sql).toContain('ADD CONSTRAINT fk_reservations_user_id FOREIGN KEY ("user_id") REFERENCES "users" ("id")');
  });

  it("adds a UNIQUE constraint in addition to the FK for one-to-one relationships", () => {
    const profileTable: DatabaseTable = {
      name: "profiles",
      description: "",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid", nullable: false, description: "" },
        { name: "user_id", type: "uuid", nullable: false, description: "" },
      ],
    };
    const sql = buildRelationshipSQL({ from: "users", to: "profiles", type: "one-to-one", description: "" }, [
      usersTable,
      profileTable,
    ]);
    expect(sql).toContain("ADD CONSTRAINT uq_profiles_user_id UNIQUE");
  });

  it("synthesizes a join table for many-to-many relationships", () => {
    const tagsTable: DatabaseTable = { name: "tags", description: "", primaryKey: "id", columns: [{ name: "id", type: "uuid", nullable: false, description: "" }] };
    const postsTable: DatabaseTable = { name: "posts", description: "", primaryKey: "id", columns: [{ name: "id", type: "uuid", nullable: false, description: "" }] };
    const sql = buildRelationshipSQL({ from: "posts", to: "tags", type: "many-to-many", description: "" }, [postsTable, tagsTable]);

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "posts_tags"');
    expect(sql).toContain('"post_id" uuid NOT NULL REFERENCES "posts" ("id")');
    expect(sql).toContain('"tag_id" uuid NOT NULL REFERENCES "tags" ("id")');
  });

  it("never invents a foreign key column that doesn't exist — falls back to a TODO comment", () => {
    const noFkTable: DatabaseTable = {
      name: "orphans",
      description: "",
      primaryKey: "id",
      columns: [{ name: "id", type: "uuid", nullable: false, description: "" }],
    };
    const sql = buildRelationshipSQL({ from: "users", to: "orphans", type: "one-to-many", description: "" }, [
      usersTable,
      noFkTable,
    ]);
    expect(sql.trim().startsWith("--")).toBe(true);
    expect(sql).not.toContain("ADD CONSTRAINT");
  });

  it("falls back to a TODO comment when either table referenced by the relationship doesn't exist", () => {
    const sql = buildRelationshipSQL({ from: "ghost", to: "users", type: "one-to-many", description: "" }, [usersTable]);
    expect(sql.trim().startsWith("--")).toBe(true);
  });
});

describe("Database Code Generator — buildIndexSQL() (deterministic)", () => {
  it("emits a CREATE INDEX statement covering every listed column", () => {
    const sql = buildIndexSQL({ table: "users", columns: ["email"], reason: "이메일로 로그인 조회" });
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email")');
  });
});

describe("Database Code Generator — RLS parsing/fallback", () => {
  it("parseRlsBatch() parses a valid JSON payload", () => {
    const payload = { policies: [{ table: "users", description: "본인만 조회 가능", sql: fakeRlsSqlFor("users") }] };
    expect(parseRlsBatch(JSON.stringify(payload))).toEqual(payload.policies);
  });

  it("parseRlsBatch() drops a policy whose sql doesn't contain CREATE POLICY", () => {
    const payload = { policies: [{ table: "users", description: "desc", sql: "-- not real sql" }] };
    expect(parseRlsBatch(JSON.stringify(payload))).toBeNull();
  });

  it("buildDefaultRlsSQL() produces a permissive (never over-restrictive) fallback with a TODO warning", () => {
    const sql = buildDefaultRlsSQL({ table: "reservations", description: "본인 예약만 조회 가능" });
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("USING (true)");
    expect(sql).toContain("TODO");
  });
});

describe("Database Code Generator — generateDatabaseCode()", () => {
  it("always includes deterministic table/relationship/index DDL, with or without AI", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const result = await generateDatabaseCode(DATABASE_DESIGN, fakeChat);
    const sql = result.content.files[0].code;

    for (const table of DATABASE_DESIGN.content.tables) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "${table.name}"`);
    }
  });

  it("uses AI-provided RLS SQL (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(buildFullAiContent()),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateDatabaseCode(DATABASE_DESIGN, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.content.files[0].code).toContain("auth.uid() = user_id");
  });

  it("falls back entirely (simulated:true) when the chat function reports failure, matching buildDefaultDatabaseCode()", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const result = await generateDatabaseCode(DATABASE_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultDatabaseCode(DATABASE_DESIGN));
  });

  it("falls back entirely (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });
    const result = await generateDatabaseCode(DATABASE_DESIGN, fakeChat);
    expect(result.simulated).toBe(true);
  });

  it("gap-fills a single RLS policy whose response omits it, keeping the rest of the batch's AI SQL", async () => {
    const omittedPolicy = DATABASE_DESIGN.content.rlsPolicies[0];
    const fakeChat = async (): Promise<ChatResult> => {
      const content = buildFullAiContent();
      content.policies = content.policies.filter((p) => p.table !== omittedPolicy.table);
      return { success: true, content: JSON.stringify(content), provider: "anthropic", model: "claude-sonnet-5" };
    };

    const result = await generateDatabaseCode(DATABASE_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content.files[0].code).toContain(buildDefaultRlsSQL(omittedPolicy));
    // other tables' AI-provided policies survive
    const otherPolicy = DATABASE_DESIGN.content.rlsPolicies.find((p) => p.table !== omittedPolicy.table)!;
    expect(result.content.files[0].code).toContain(fakeRlsSqlFor(otherPolicy.table));
  });
});
