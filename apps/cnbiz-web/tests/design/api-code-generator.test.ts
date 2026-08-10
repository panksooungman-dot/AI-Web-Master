import ts from "typescript";
import { describe, expect, it } from "vitest";
import { generateApiCode } from "../../lib/design/api-code-generator";
import { buildDefaultBackendDesign } from "../../lib/design/backend-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { ApiDesignRecord } from "../../lib/design/api-design";
import type { BackendDesignRecord } from "../../lib/design/backend-design";
import type { DatabaseDesignRecord } from "../../lib/design/database-design";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";

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

const API_DESIGN: ApiDesignRecord = {
  id: "api-design-1",
  databaseDesignId: DATABASE_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultApiDesign(DATABASE_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const BACKEND_DESIGN: BackendDesignRecord = {
  id: "backend-design-1",
  apiDesignId: API_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultBackendDesign(API_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

function assertValidTypeScript(source: string) {
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  expect(errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n"))).toEqual([]);
}

describe("API Code Generator — generateApiCode()", () => {
  it("is a pure deterministic function — calling it twice with the same input produces identical output", () => {
    const a = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    const b = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    expect(a).toEqual(b);
  });

  it("always includes the shared lib/services/store.ts file", () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    expect(content.files.some((f) => f.path === "lib/services/store.ts")).toBe(true);
  });

  it("groups collection-level (no :id) and item-level (:id) endpoints into separate route.ts files per resource", () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    const paths = content.files.map((f) => f.path);
    // buildDefaultApiDesign() always emits both a collection route (GET/POST) and an item route
    // (GET/PATCH/DELETE at .../:id) per resource table.
    expect(paths.some((p) => /^app\/api\/[^/]+\/route\.ts$/.test(p))).toBe(true);
    expect(paths.some((p) => /^app\/api\/[^/]+\/\[id\]\/route\.ts$/.test(p))).toBe(true);
  });

  it("every route file imports and calls the exact serviceFunction name Backend Design assigned to that endpoint", () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    const allCode = content.files.map((f) => f.code).join("\n");
    for (const entry of BACKEND_DESIGN.content.logic) {
      expect(allCode).toContain(entry.serviceFunction);
    }
  });

  /** Splits a route file's source into one string per exported handler function, so an auth-guard
   *  check on one handler (e.g. POST) can't accidentally match a sibling handler in the same file
   *  (e.g. GET) that happens to share the file. */
  function extractHandlerBlocks(code: string): string[] {
    return code.split(/(?=export async function)/).filter((block) => block.startsWith("export async function"));
  }

  it("calls requireAuth(request) exactly when API Design flagged that endpoint requiresAuth:true", () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    const authRequiredEndpoint = API_DESIGN.content.endpoints.find((e) => e.requiresAuth);
    const publicEndpoint = API_DESIGN.content.endpoints.find((e) => !e.requiresAuth);
    expect(authRequiredEndpoint).toBeDefined();
    expect(publicEndpoint).toBeDefined();

    for (const file of content.files) {
      for (const block of extractHandlerBlocks(file.code)) {
        const matchingLogic = BACKEND_DESIGN.content.logic.find((l) => block.includes(`await ${l.serviceFunction}(`));
        if (!matchingLogic) continue;
        const endpoint = API_DESIGN.content.endpoints.find(
          (e) => e.method === matchingLogic.method && e.path === matchingLogic.path
        )!;
        expect(block.includes("requireAuth(request)")).toBe(endpoint.requiresAuth);
      }
    }
  });

  it("every generated .ts file is valid, compilable TypeScript", () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    for (const file of content.files) {
      if (!file.path.endsWith(".ts")) continue; // openapi.json is JSON, not TypeScript
      assertValidTypeScript(file.code);
    }
  });

  it("openapi.json is valid, parseable JSON describing every generated route", () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    const specFile = content.files.find((f) => f.path === "openapi.json")!;
    expect(specFile).toBeDefined();
    const spec = JSON.parse(specFile.code);
    expect(spec.openapi).toBe("3.0.3");
    for (const endpoint of API_DESIGN.content.endpoints) {
      const openApiPath = endpoint.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
      expect(spec.paths[openApiPath]).toBeDefined();
      expect(spec.paths[openApiPath][endpoint.method.toLowerCase()]).toBeDefined();
    }
  });

  it("calling getServiceStore() without SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY throws a clear, actionable error (not a silent no-op)", async () => {
    const content = generateApiCode(BACKEND_DESIGN, API_DESIGN);
    const storeFile = content.files.find((f) => f.path === "lib/services/store.ts")!;
    const transpiled = ts.transpileModule(storeFile.code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;

    // store.ts does `import { createSupabaseServiceStore } from "./supabaseStore"`, which
    // transpiles to a top-level require() — stub it out since the unconfigured-env branch never
    // actually calls createSupabaseServiceStore().
    const moduleExports: Record<string, unknown> = {};
    const fakeRequire = () => ({ createSupabaseServiceStore: () => { throw new Error("should not be called"); } });
    const fn = new Function("exports", "require", transpiled);
    fn(moduleExports, fakeRequire);

    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      expect(() => (moduleExports.getServiceStore as () => unknown)()).toThrow(/실제 데이터베이스에 연결되지 않았습니다/);
    } finally {
      if (previousUrl !== undefined) process.env.SUPABASE_URL = previousUrl;
      if (previousKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    }
  });
});

// Regression: a real E2E (2026-08-10) showed the AI choosing OpenAPI-style "{id}" path params
// instead of Express-style ":id" for a real Backend/API Design. The original hasId check only
// recognized ":id", so the item-level GET/PATCH/DELETE were wrongly merged into the same file as
// the collection-level GET/POST, producing a file with TWO `export async function GET` blocks —
// a genuine TypeScript compile error, caught only by generating against real AI output.
describe("API Code Generator — '{id}' (OpenAPI-style) path param regression", () => {
  const CURLY_API_DESIGN: ApiDesignRecord = {
    ...API_DESIGN,
    content: {
      ...API_DESIGN.content,
      endpoints: [
        { method: "GET", path: "/api/guestbook-entries", description: "목록", requiresAuth: false, requestBody: "", responseShape: "entries[]" },
        { method: "GET", path: "/api/guestbook-entries/{id}", description: "단건", requiresAuth: false, requestBody: "", responseShape: "entry" },
        { method: "POST", path: "/api/guestbook-entries", description: "생성", requiresAuth: false, requestBody: "entry", responseShape: "entry" },
        { method: "PATCH", path: "/api/guestbook-entries/{id}", description: "수정", requiresAuth: true, requestBody: "entry", responseShape: "entry" },
        { method: "DELETE", path: "/api/guestbook-entries/{id}", description: "삭제", requiresAuth: true, requestBody: "", responseShape: "{success:boolean}" },
      ],
    },
  };
  const CURLY_BACKEND_DESIGN: BackendDesignRecord = {
    ...BACKEND_DESIGN,
    content: {
      ...BACKEND_DESIGN.content,
      logic: [
        { method: "GET", path: "/api/guestbook-entries", serviceFunction: "listGuestbookEntries", validationRules: [], businessRules: [], errorHandling: [] },
        { method: "GET", path: "/api/guestbook-entries/{id}", serviceFunction: "getGuestbookEntryById", validationRules: [], businessRules: [], errorHandling: [] },
        { method: "POST", path: "/api/guestbook-entries", serviceFunction: "createGuestbookEntry", validationRules: [], businessRules: [], errorHandling: [] },
        { method: "PATCH", path: "/api/guestbook-entries/{id}", serviceFunction: "updateGuestbookEntry", validationRules: [], businessRules: [], errorHandling: [] },
        { method: "DELETE", path: "/api/guestbook-entries/{id}", serviceFunction: "deleteGuestbookEntry", validationRules: [], businessRules: [], errorHandling: [] },
      ],
    },
  };

  it("splits collection-level (GET list, POST) and item-level (GET single, PATCH, DELETE) into separate route files, not merged", () => {
    const content = generateApiCode(CURLY_BACKEND_DESIGN, CURLY_API_DESIGN);
    const collectionFile = content.files.find((f) => f.path === "app/api/guestbook-entries/route.ts")!;
    const itemFile = content.files.find((f) => f.path === "app/api/guestbook-entries/[id]/route.ts")!;

    expect(collectionFile).toBeDefined();
    expect(itemFile).toBeDefined();
    expect((collectionFile.code.match(/export async function GET/g) ?? []).length).toBe(1);
    expect(collectionFile.code).toContain("listGuestbookEntries");
    expect(collectionFile.code).toContain("createGuestbookEntry");
    expect(itemFile.code).toContain("getGuestbookEntryById");
    expect(itemFile.code).toContain("updateGuestbookEntry");
    expect(itemFile.code).toContain("deleteGuestbookEntry");
  });

  it("every generated .ts file compiles as valid TypeScript with no duplicate exports", () => {
    const content = generateApiCode(CURLY_BACKEND_DESIGN, CURLY_API_DESIGN);
    for (const file of content.files) {
      if (!file.path.endsWith(".ts")) continue; // openapi.json is JSON, not TypeScript
      assertValidTypeScript(file.code);
    }
  });
});
