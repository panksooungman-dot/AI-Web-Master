import { describe, expect, it } from "vitest";
import {
  buildDefaultDatabaseDesign,
  generateDatabaseDesign,
  parseDatabaseDesignContent,
} from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
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

const VALID_CONTENT = {
  tables: [
    {
      name: "reservations",
      description: "예약 정보",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid", nullable: false, description: "기본 키" },
        { name: "patient_name", type: "text", nullable: false, description: "환자명" },
      ],
    },
  ],
  relationships: [{ from: "users", to: "reservations", type: "one-to-many", description: "한 사용자가 여러 예약을 가질 수 있다." }],
  indexes: [{ table: "reservations", columns: ["patient_name"], reason: "이름으로 검색을 빠르게 하기 위함" }],
  rlsPolicies: [{ table: "reservations", description: "본인 예약만 조회 가능" }],
  migrationNotes: "예약 테이블부터 우선 배포한다.",
};

describe("Database Design Generator — parseDatabaseDesignContent()", () => {
  it("parses a valid JSON payload", () => {
    expect(parseDatabaseDesignContent(JSON.stringify(VALID_CONTENT))).toEqual(VALID_CONTENT);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    expect(parseDatabaseDesignContent(fenced)).toEqual(VALID_CONTENT);
  });

  it("returns null for unparseable JSON", () => {
    expect(parseDatabaseDesignContent("not json")).toBeNull();
  });

  it("returns null when a relationship type isn't one of the allowed values", () => {
    const broken = { ...VALID_CONTENT, relationships: [{ ...VALID_CONTENT.relationships[0], type: "sideways" }] };
    expect(parseDatabaseDesignContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when a table has no columns (all-or-nothing validation)", () => {
    const broken = { ...VALID_CONTENT, tables: [{ ...VALID_CONTENT.tables[0], columns: [] }] };
    expect(parseDatabaseDesignContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when tables is empty", () => {
    const broken = { ...VALID_CONTENT, tables: [] };
    expect(parseDatabaseDesignContent(JSON.stringify(broken))).toBeNull();
  });
});

describe("Database Design Generator — buildDefaultDatabaseDesign()", () => {
  it("always includes a users table plus one table per feature", () => {
    const content = buildDefaultDatabaseDesign(PLAN);
    expect(content.tables.some((t) => t.name === "users")).toBe(true);
    expect(content.tables.length).toBe(PLAN.content.featureList.length + 1);
  });

  it("every table has a non-empty column list and a primary key", () => {
    const content = buildDefaultDatabaseDesign(PLAN);
    for (const table of content.tables) {
      expect(table.columns.length).toBeGreaterThan(0);
      expect(table.primaryKey).toBeTruthy();
    }
  });
});

describe("Database Design Generator — generateDatabaseDesign()", () => {
  it("uses the AI-provided content (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_CONTENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateDatabaseDesign(PLAN, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.content).toEqual(VALID_CONTENT);
  });

  it("falls back to a deterministic default (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const result = await generateDatabaseDesign(PLAN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultDatabaseDesign(PLAN));
  });

  it("falls back to a deterministic default (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });
    const result = await generateDatabaseDesign(PLAN, fakeChat);

    expect(result.simulated).toBe(true);
  });
});
