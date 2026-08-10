import { describe, expect, it } from "vitest";
import { buildDefaultApiDesign, generateApiDesign, parseApiDesignContent } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DatabaseDesignRecord } from "../../lib/design/database-design";
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

const DATABASE_DESIGN: DatabaseDesignRecord = {
  id: "database-design-1",
  planId: PLAN.id,
  version: 1,
  content: buildDefaultDatabaseDesign(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const VALID_CONTENT = {
  endpoints: [
    {
      method: "GET",
      path: "/api/reservations",
      description: "예약 목록 조회",
      requiresAuth: false,
      requestBody: "",
      responseShape: "reservations[]",
    },
    {
      method: "POST",
      path: "/api/reservations",
      description: "예약 생성",
      requiresAuth: true,
      requestBody: "reservation",
      responseShape: "reservation",
    },
  ],
  authenticationStrategy: "세션 기반 인증을 사용한다.",
  fileUploadEndpoints: [],
  apiTestNotes: "예약 생성 엔드포인트부터 테스트한다.",
};

describe("API Design Generator — parseApiDesignContent()", () => {
  it("parses a valid JSON payload", () => {
    expect(parseApiDesignContent(JSON.stringify(VALID_CONTENT))).toEqual(VALID_CONTENT);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    expect(parseApiDesignContent(fenced)).toEqual(VALID_CONTENT);
  });

  it("returns null for unparseable JSON", () => {
    expect(parseApiDesignContent("not json")).toBeNull();
  });

  it("returns null when an endpoint method isn't one of the allowed HTTP verbs", () => {
    const broken = { ...VALID_CONTENT, endpoints: [{ ...VALID_CONTENT.endpoints[0], method: "TRACE" }] };
    expect(parseApiDesignContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when endpoints is empty", () => {
    const broken = { ...VALID_CONTENT, endpoints: [] };
    expect(parseApiDesignContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when authenticationStrategy is missing", () => {
    const broken = { ...VALID_CONTENT, authenticationStrategy: "" };
    expect(parseApiDesignContent(JSON.stringify(broken))).toBeNull();
  });
});

describe("API Design Generator — buildDefaultApiDesign()", () => {
  it("generates 5 CRUD endpoints per non-users table", () => {
    const content = buildDefaultApiDesign(DATABASE_DESIGN);
    const resourceTableCount = DATABASE_DESIGN.content.tables.filter((t) => t.name !== "users").length;
    expect(content.endpoints.length).toBe(resourceTableCount * 5);
  });

  it("never targets the users table directly", () => {
    const content = buildDefaultApiDesign(DATABASE_DESIGN);
    expect(content.endpoints.some((e) => e.path === "/api/users" || e.path === "/api/users/:id")).toBe(false);
  });

  it("every endpoint method is a valid HTTP verb", () => {
    const content = buildDefaultApiDesign(DATABASE_DESIGN);
    for (const endpoint of content.endpoints) {
      expect(["GET", "POST", "PUT", "PATCH", "DELETE"]).toContain(endpoint.method);
    }
  });
});

describe("API Design Generator — generateApiDesign()", () => {
  it("uses the AI-provided content (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_CONTENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateApiDesign(DATABASE_DESIGN, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.content).toEqual(VALID_CONTENT);
  });

  it("falls back to a deterministic default (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const result = await generateApiDesign(DATABASE_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultApiDesign(DATABASE_DESIGN));
  });

  it("falls back to a deterministic default (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });
    const result = await generateApiDesign(DATABASE_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
  });
});
