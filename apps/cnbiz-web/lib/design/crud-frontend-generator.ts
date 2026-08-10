import type { BackendDesignRecord, BackendLogicEndpoint } from "./backend-design";
import type { DatabaseColumn, DatabaseDesignRecord, DatabaseTable } from "./database-design";
import type { CrudFrontendContent, GeneratedFrontendFile } from "./crud-frontend";

function isPathParamSegment(segment: string): boolean {
  return segment.startsWith(":") || (segment.startsWith("{") && segment.endsWith("}"));
}

function hasPathParam(path: string): boolean {
  return path.split("/").some(isPathParamSegment);
}

/** "/api/상가/:id" → "상가", "/api/상가" → "상가" — api-code-generator.ts/backend-design-generator.ts와
 *  동일한 추출 규칙(대응하는 lib/api-client.ts 함수를 정확히 찾으려면 같은 규칙을 써야 한다). */
function extractResource(path: string): string {
  const segments = path.split("/").filter((segment) => segment && segment !== "api" && !isPathParamSegment(segment));
  return segments[0] ?? "resource";
}

function toFileSlug(resource: string): string {
  return resource.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "") || "resource";
}

function pascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9가-힣]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** app/<slug>/(new/[id]/)page.tsx → lib/api-client.ts로 가는 상대 경로 깊이. */
function relativeRootPrefix(filePath: string): string {
  const depth = filePath.split("/").length - 1;
  return "../".repeat(depth);
}

interface ResourceOps {
  rawResource: string;
  slug: string;
  list: BackendLogicEndpoint | null;
  create: BackendLogicEndpoint | null;
  getById: BackendLogicEndpoint | null;
  update: BackendLogicEndpoint | null;
  remove: BackendLogicEndpoint | null;
}

function groupByResource(logic: BackendLogicEndpoint[]): ResourceOps[] {
  const byResource = new Map<string, ResourceOps>();

  for (const entry of logic) {
    const rawResource = extractResource(entry.path);
    const ops = byResource.get(rawResource) ?? {
      rawResource,
      slug: toFileSlug(rawResource),
      list: null,
      create: null,
      getById: null,
      update: null,
      remove: null,
    };

    const hasId = hasPathParam(entry.path);
    switch (entry.method) {
      case "GET":
        if (hasId) ops.getById = entry;
        else ops.list = entry;
        break;
      case "POST":
        ops.create = entry;
        break;
      case "PUT":
      case "PATCH":
        if (hasId) ops.update = entry;
        break;
      case "DELETE":
        if (hasId) ops.remove = entry;
        break;
      default:
        break;
    }

    byResource.set(rawResource, ops);
  }

  return Array.from(byResource.values());
}

function findMatchingTable(rawResource: string, tables: DatabaseTable[]): DatabaseTable | null {
  return tables.find((table) => table.name === rawResource) ?? null;
}

/** 매칭되는 테이블이 없을 때도 항상 유효한(컴파일 가능한) 폼이 나오도록 하는 최소 필드 — 테이블
 *  없이도 "name" 하나로 등록/수정은 가능하다(완전하지 않지만 동작은 한다). */
const FALLBACK_COLUMNS: DatabaseColumn[] = [{ name: "name", type: "text", nullable: false, description: "" }];

function formFieldsFor(table: DatabaseTable | null): DatabaseColumn[] {
  if (!table) return FALLBACK_COLUMNS;
  const fields = table.columns.filter((column) => column.name !== table.primaryKey);
  return fields.length > 0 ? fields : FALLBACK_COLUMNS;
}

function inputTypeFor(column: DatabaseColumn): "checkbox" | "number" | "text" {
  const type = column.type.toLowerCase();
  if (type.includes("bool")) return "checkbox";
  if (type.includes("int") || type.includes("numeric") || type.includes("float") || type.includes("decimal")) return "number";
  return "text";
}

function fieldInitialValue(inputType: "checkbox" | "number" | "text"): string {
  if (inputType === "checkbox") return "false";
  if (inputType === "number") return "0";
  return '""';
}

function buildFieldInput(column: DatabaseColumn, valueExpr: string, onChangeExpr: string): string {
  const inputType = inputTypeFor(column);
  const label = column.description || column.name;

  // onChangeExpr is itself an arrow-function EXPRESSION string (e.g. "(v) => setForm(...)"), so it
  // must be parenthesized before being immediately invoked — otherwise "(e) => onChangeExpr(x)"
  // parses as "(e) => (v) => (setForm(...)(x))" (arrow bodies extend as far right as possible),
  // which tries to call setForm(...)'s `void` return value instead of invoking onChangeExpr itself.
  if (inputType === "checkbox") {
    return (
      `        <label className="block">\n` +
      `          <span className="mr-2">${JSON.stringify(label)}</span>\n` +
      `          <input type="checkbox" checked={Boolean(${valueExpr})} onChange={(e) => (${onChangeExpr})(e.target.checked)} />\n` +
      `        </label>`
    );
  }

  const htmlType = inputType === "number" ? "number" : "text";
  const parse = inputType === "number" ? "Number(e.target.value)" : "e.target.value";

  return (
    `        <label className="block">\n` +
    `          <span className="block text-sm">${JSON.stringify(label)}</span>\n` +
    `          <input type="${htmlType}" value={${valueExpr} as any} onChange={(e) => (${onChangeExpr})(${parse})} className="border px-2 py-1 w-full" />\n` +
    `        </label>`
  );
}

function buildListPage(ops: ResourceOps, table: DatabaseTable | null): GeneratedFrontendFile {
  const filePath = `app/${ops.slug}/page.tsx`;
  const root = relativeRootPrefix(filePath);
  const title = table?.description || table?.name || ops.rawResource;
  const fields = formFieldsFor(table);
  const componentName = `${pascalCase(ops.rawResource)}ListPage`;

  const imports = [ops.list?.serviceFunction, ops.remove?.serviceFunction].filter(Boolean).join(", ");
  const deleteHandler = ops.remove
    ? `\n\n  async function handleDelete(id: string) {\n    if (!confirm("삭제하시겠습니까?")) return;\n    await ${ops.remove.serviceFunction}(id);\n    refresh();\n  }`
    : "";
  const deleteCell = ops.remove
    ? `\n                  <button type="button" onClick={() => handleDelete(String((item as any).id))} className="text-red-600">\n                    삭제\n                  </button>`
    : "";
  const editLink = ops.getById ? `\n                  <a href={\`/${ops.slug}/\${(item as any).id}\`}>수정</a>` : "";
  const newLink = ops.create ? `\n      <a href="/${ops.slug}/new">새로 만들기</a>` : "";

  const code = `"use client";

import { useEffect, useState } from "react";
import { ${imports} } from "${root}lib/api-client";

export default function ${componentName}() {
  const [items, setItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const result = await ${ops.list!.serviceFunction}();
      setItems(Array.isArray(result) ? result : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);${deleteHandler}

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">${title}</h1>${newLink}
      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}
      <table className="w-full border-collapse mt-4">
        <thead>
          <tr>
${fields.map((f) => `            <th className="border px-2 py-1 text-left">${JSON.stringify(f.description || f.name)}</th>`).join("\n")}
            <th className="border px-2 py-1">작업</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={(item as any).id ?? index}>
${fields.map((f) => `              <td className="border px-2 py-1">{String((item as any)[${JSON.stringify(f.name)}] ?? "")}</td>`).join("\n")}
              <td className="border px-2 py-1">${editLink}${deleteCell}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;

  return { path: filePath, code };
}

function buildNewPage(ops: ResourceOps, table: DatabaseTable | null): GeneratedFrontendFile {
  const filePath = `app/${ops.slug}/new/page.tsx`;
  const root = relativeRootPrefix(filePath);
  const title = table?.description || table?.name || ops.rawResource;
  const fields = formFieldsFor(table);
  const componentName = `New${pascalCase(ops.rawResource)}Page`;

  const initial = fields.map((f) => `    ${JSON.stringify(f.name)}: ${fieldInitialValue(inputTypeFor(f))},`).join("\n");
  const inputs = fields
    .map((f) => buildFieldInput(f, `form[${JSON.stringify(f.name)}]`, `(v) => setForm({ ...form, [${JSON.stringify(f.name)}]: v })`))
    .join("\n");

  const code = `"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ${ops.create!.serviceFunction} } from "${root}lib/api-client";

export default function ${componentName}() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, unknown>>({
${initial}
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ${ops.create!.serviceFunction}(form);
      router.push("/${ops.slug}");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">${title} 등록</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
${inputs}
        {error && <p className="text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="border px-4 py-2">
          저장
        </button>
      </form>
    </div>
  );
}
`;

  return { path: filePath, code };
}

function buildEditPage(ops: ResourceOps, table: DatabaseTable | null): GeneratedFrontendFile {
  const filePath = `app/${ops.slug}/[id]/page.tsx`;
  const root = relativeRootPrefix(filePath);
  const title = table?.description || table?.name || ops.rawResource;
  const fields = formFieldsFor(table);
  const componentName = `Edit${pascalCase(ops.rawResource)}Page`;

  const imports = [ops.getById!.serviceFunction, ops.update?.serviceFunction, ops.remove?.serviceFunction].filter(Boolean).join(", ");
  const inputs = fields
    .map((f) =>
      buildFieldInput(f, `form?.[${JSON.stringify(f.name)}]`, `(v) => setForm({ ...(form ?? {}), [${JSON.stringify(f.name)}]: v })`)
    )
    .join("\n");

  const updateBlock = ops.update
    ? `\n  async function handleSubmit(e: FormEvent) {\n    e.preventDefault();\n    if (!form) return;\n    try {\n      await ${ops.update.serviceFunction}(id, form);\n      router.push("/${ops.slug}");\n    } catch (err) {\n      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");\n    }\n  }`
    : "";
  const deleteBlock = ops.remove
    ? `\n  async function handleDelete() {\n    if (!confirm("삭제하시겠습니까?")) return;\n    await ${ops.remove.serviceFunction}(id);\n    router.push("/${ops.slug}");\n  }`
    : "";
  const submitButton = ops.update ? `\n        <button type="submit" className="border px-4 py-2">\n          저장\n        </button>` : "";
  const deleteButton = ops.remove
    ? `\n        <button type="button" onClick={handleDelete} className="border px-4 py-2 text-red-600">\n          삭제\n        </button>`
    : "";
  const formTag = ops.update ? `<form onSubmit={handleSubmit} className="space-y-3">` : `<div className="space-y-3">`;
  const formCloseTag = ops.update ? "</form>" : "</div>";

  const reactImports = ops.update ? "useEffect, useState, type FormEvent" : "useEffect, useState";
  const needsRouter = Boolean(ops.update || ops.remove);
  const navigationImports = needsRouter ? "useParams, useRouter" : "useParams";
  const routerLine = needsRouter ? "\n  const router = useRouter();" : "";
  const code = `"use client";

import { ${reactImports} } from "react";
import { ${navigationImports} } from "next/navigation";
import { ${imports} } from "${root}lib/api-client";

export default function ${componentName}() {
  const params = useParams<{ id: string }>();
  const id = params.id;${routerLine}
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ${ops.getById!.serviceFunction}(id)
      .then((data) => setForm(data as Record<string, unknown>))
      .catch((err) => setError(err instanceof Error ? err.message : "불러오지 못했습니다."));
  }, [id]);
${updateBlock}${deleteBlock}

  if (!form) {
    return (
      <div className="p-6">
        {error ? <p className="text-red-600">{error}</p> : <p>불러오는 중...</p>}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">${title} 수정</h1>
      ${formTag}
${inputs}
        {error && <p className="text-red-600">{error}</p>}${submitButton}${deleteButton}
      ${formCloseTag}
    </div>
  );
}
`;

  return { path: filePath, code };
}

function buildAdminIndexPage(resources: { slug: string; title: string }[]): GeneratedFrontendFile {
  const items = resources
    .map((r) => `        <li>\n          <a href="/${r.slug}">${JSON.stringify(r.title).slice(1, -1)}</a>\n        </li>`)
    .join("\n");

  return {
    path: "app/admin/page.tsx",
    code: `export default function AdminDashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">관리</h1>
      <ul className="space-y-2 list-disc pl-5">
${items}
      </ul>
    </div>
  );
}
`,
  };
}

/**
 * API Code(lib/api-client.ts의 실제 함수)와 Database Design(폼 필드)만으로, AI 없이 리소스마다
 * 목록·등록·수정 화면을 생성한다. Database Design에 이름이 정확히 일치하는 테이블이 없으면(AI가
 * Database/API Design을 서로 다른 이름으로 지었을 경우) 최소 필드("name" 하나)로 폴백해도 항상
 * 컴파일 가능한 화면이 나오도록 한다 — 04(DB)/05(API)의 결정론적 폴백 원칙과 동일.
 */
export function generateCrudFrontend(backend: BackendDesignRecord, database: DatabaseDesignRecord): CrudFrontendContent {
  const resourceGroups = groupByResource(backend.content.logic);
  const files: GeneratedFrontendFile[] = [];
  const unmatched: string[] = [];
  const indexEntries: { slug: string; title: string }[] = [];

  for (const ops of resourceGroups) {
    const table = findMatchingTable(ops.rawResource, database.content.tables);
    if (!table) unmatched.push(ops.rawResource);

    if (ops.list) {
      files.push(buildListPage(ops, table));
      indexEntries.push({ slug: ops.slug, title: table?.description || table?.name || ops.rawResource });
    }
    if (ops.create) files.push(buildNewPage(ops, table));
    if (ops.getById) files.push(buildEditPage(ops, table));
  }

  if (indexEntries.length > 0) files.push(buildAdminIndexPage(indexEntries));

  const notes =
    unmatched.length > 0
      ? `Database Design과 이름이 일치하지 않아 최소 필드("name")로만 생성된 리소스: ${unmatched.join(", ")}. 실제 필드에 맞게 폼을 수동으로 보완하세요.`
      : "모든 리소스가 Database Design의 실제 컬럼 정보로 생성되었습니다.";

  return { files, notes };
}
