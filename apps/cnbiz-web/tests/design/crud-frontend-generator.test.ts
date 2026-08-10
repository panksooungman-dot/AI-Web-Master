import ts from "typescript";
import { describe, expect, it } from "vitest";
import { generateCrudFrontend } from "../../lib/design/crud-frontend-generator";
import { buildDefaultBackendDesign } from "../../lib/design/backend-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { ApiDesignRecord } from "../../lib/design/api-design";
import type { BackendDesignRecord, BackendDesignContent } from "../../lib/design/backend-design";
import type { DatabaseDesignRecord, DatabaseDesignContent } from "../../lib/design/database-design";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";

const PLAN_INPUT: DesignPlanInput = {
  projectName: "상가 관리 시스템",
  projectType: "웹앱",
  requirements: "상가 입주 정보와 임대료를 관리해야 합니다.",
  targetUsers: "건물 관리자",
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

function assertValidTsx(source: string) {
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  expect(errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n"))).toEqual([]);
}

describe("CRUD Frontend Generator — generateCrudFrontend()", () => {
  it("is a pure deterministic function — calling it twice with the same input produces identical output", () => {
    const a = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    const b = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    expect(a).toEqual(b);
  });

  it("generates a list/new/edit page per resource plus an admin index page", () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    const paths = content.files.map((f) => f.path);

    expect(paths).toContain("app/admin/page.tsx");
    expect(paths.some((p) => /^app\/[^/]+\/page\.tsx$/.test(p) && p !== "app/admin/page.tsx")).toBe(true);
    expect(paths.some((p) => /^app\/[^/]+\/new\/page\.tsx$/.test(p))).toBe(true);
    expect(paths.some((p) => /^app\/[^/]+\/\[id\]\/page\.tsx$/.test(p))).toBe(true);
  });

  it("every generated page is valid, compilable TSX", () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    for (const file of content.files) {
      assertValidTsx(file.code);
    }
  });

  it("list page imports and calls the exact list/delete serviceFunction names Backend Design assigned", () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    const table = DATABASE_DESIGN.content.tables.find((t) => t.name !== "users")!;
    const listEntry = BACKEND_DESIGN.content.logic.find((l) => l.method === "GET" && l.path === `/api/${table.name}`);
    const deleteEntry = BACKEND_DESIGN.content.logic.find(
      (l) => l.method === "DELETE" && l.path === `/api/${table.name}/:id`
    );
    const listPage = content.files.find((f) => f.path === `app/${table.name}/page.tsx`)!;

    expect(listPage).toBeDefined();
    expect(listPage.code).toContain(`import { ${listEntry!.serviceFunction}, ${deleteEntry!.serviceFunction} }`);
    expect(listPage.code).toContain(`await ${listEntry!.serviceFunction}()`);
    expect(listPage.code).toContain(`await ${deleteEntry!.serviceFunction}(id)`);
    expect(listPage.code).toContain('from "../../lib/api-client"');
  });

  it("new page imports and calls the exact create serviceFunction name, one field per non-primary-key column", () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    const table = DATABASE_DESIGN.content.tables.find((t) => t.name !== "users")!;
    const createEntry = BACKEND_DESIGN.content.logic.find((l) => l.method === "POST" && l.path === `/api/${table.name}`);
    const newPage = content.files.find((f) => f.path === `app/${table.name}/new/page.tsx`)!;

    expect(newPage).toBeDefined();
    expect(newPage.code).toContain(`import { ${createEntry!.serviceFunction} }`);
    expect(newPage.code).toContain(`await ${createEntry!.serviceFunction}(form)`);
    expect(newPage.code).toContain('from "../../../lib/api-client"');

    const nonPkColumns = table.columns.filter((c) => c.name !== table.primaryKey);
    for (const column of nonPkColumns) {
      expect(newPage.code).toContain(JSON.stringify(column.name));
    }
    expect(newPage.code).not.toContain(JSON.stringify(table.primaryKey));
  });

  it("edit page imports and calls the exact getById/update/delete serviceFunction names", () => {
    const content = generateCrudFrontend(BACKEND_DESIGN, DATABASE_DESIGN);
    const table = DATABASE_DESIGN.content.tables.find((t) => t.name !== "users")!;
    const getEntry = BACKEND_DESIGN.content.logic.find((l) => l.method === "GET" && l.path === `/api/${table.name}/:id`);
    const updateEntry = BACKEND_DESIGN.content.logic.find(
      (l) => l.method === "PATCH" && l.path === `/api/${table.name}/:id`
    );
    const deleteEntry = BACKEND_DESIGN.content.logic.find(
      (l) => l.method === "DELETE" && l.path === `/api/${table.name}/:id`
    );
    const editPage = content.files.find((f) => f.path === `app/${table.name}/[id]/page.tsx`)!;

    expect(editPage).toBeDefined();
    expect(editPage.code).toContain(getEntry!.serviceFunction);
    expect(editPage.code).toContain(`await ${updateEntry!.serviceFunction}(id, form)`);
    expect(editPage.code).toContain(`await ${deleteEntry!.serviceFunction}(id)`);
  });

  it("falls back to a minimal single-field form when no Database Design table name matches the resource", () => {
    const database: DatabaseDesignContent = {
      tables: [{ name: "differently_named_table", description: "", columns: [{ name: "id", type: "uuid", nullable: false, description: "" }], primaryKey: "id" }],
      relationships: [],
      indexes: [],
      rlsPolicies: [],
      migrationNotes: "",
    };
    const backend: BackendDesignContent = {
      logic: [
        { method: "GET", path: "/api/mismatched", serviceFunction: "listMismatched", validationRules: [], businessRules: [], errorHandling: [] },
        { method: "POST", path: "/api/mismatched", serviceFunction: "createMismatched", validationRules: [], businessRules: [], errorHandling: [] },
      ],
      sharedServices: [],
      backgroundJobs: [],
      implementationNotes: "",
    };

    const content = generateCrudFrontend(
      { ...BACKEND_DESIGN, content: backend },
      { ...DATABASE_DESIGN, content: database }
    );

    const newPage = content.files.find((f) => f.path === "app/mismatched/new/page.tsx")!;
    expect(newPage.code).toContain('"name"');
    expect(content.notes).toContain("mismatched");
    for (const file of content.files) assertValidTsx(file.code);
  });

  it("only generates the pages an incomplete CRUD set actually supports (no new/edit page without POST/GET-by-id)", () => {
    const database: DatabaseDesignContent = {
      tables: [{ name: "readonly_log", description: "읽기 전용 로그", columns: [{ name: "id", type: "uuid", nullable: false, description: "" }, { name: "message", type: "text", nullable: false, description: "" }], primaryKey: "id" }],
      relationships: [],
      indexes: [],
      rlsPolicies: [],
      migrationNotes: "",
    };
    const backend: BackendDesignContent = {
      logic: [
        { method: "GET", path: "/api/readonly_log", serviceFunction: "listReadonlyLog", validationRules: [], businessRules: [], errorHandling: [] },
      ],
      sharedServices: [],
      backgroundJobs: [],
      implementationNotes: "",
    };

    const content = generateCrudFrontend(
      { ...BACKEND_DESIGN, content: backend },
      { ...DATABASE_DESIGN, content: database }
    );

    const paths = content.files.map((f) => f.path);
    expect(paths).toContain("app/readonly-log/page.tsx");
    expect(paths).not.toContain("app/readonly-log/new/page.tsx");
    expect(paths).not.toContain("app/readonly-log/[id]/page.tsx");
    for (const file of content.files) assertValidTsx(file.code);
  });
});
