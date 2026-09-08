import type { ReactComponentNode, ReactEventStub, ReactSectionNode } from "./types.js";
import type { ReactPageStructure } from "./componentTree.js";

/**
 * React Generator — Design JSON Standardization Phase 8.
 * Pure serializer: the intermediate React Component Tree (componentTree.ts) → a Next.js
 * (App Router) TSX source string. Returns text only — nothing is written to disk here or
 * anywhere else in this module.
 *
 * Dynamic text/attribute values are embedded via `JSON.stringify()` (e.g. `{"Book Now"}`) rather
 * than raw JSX text, so arbitrary source copy (quotes, braces, backticks) can never corrupt the
 * generated TSX syntax.
 */

interface RenderContext {
  imports: Set<"Image" | "Link">;
}

function jsxString(value: unknown): string {
  return `{${JSON.stringify(typeof value === "string" ? value : String(value ?? ""))}}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function classAttr(className: string): string {
  return className ? ` className="${className}"` : "";
}

function eventAttrs(node: ReactComponentNode): string {
  const attrs: string[] = [];
  if (node.events.onClick) attrs.push(` onClick={${node.events.onClick}}`);
  if (node.events.onMouseEnter) attrs.push(` onMouseEnter={${node.events.onMouseEnter}}`);
  if (node.events.onFocus) attrs.push(` onFocus={${node.events.onFocus}}`);
  return attrs.join("");
}

/**
 * Renders props not specially handled by a type-specific renderer as plain JSX attributes.
 *
 * DesignDocument `Component.props` keys are arbitrary (whatever an Adapter chose to preserve for
 * traceability, e.g. `claude-design-document-adapter.ts`'s `{ sourceType: wireframeType }`) — they
 * are NOT guaranteed to be valid HTML/JSX attribute names. Emitting them verbatim as
 * `${key}={...}` breaks compilation for a `<div>`/`<section>` element the moment a key isn't a
 * real DOM attribute (React/TypeScript reject unknown props on intrinsic elements). Every
 * passthrough key is therefore namespaced under `data-*`, which HTML accepts for any name — this
 * was found and confirmed by actually generating a page from a DesignDocument built off an edited
 * Wireframe and running `tsc` on the output (`sourceType` failed with TS2322 on a bare `<div>`).
 */
function passthroughAttrs(node: ReactComponentNode, handledKeys: ReadonlySet<string>): string {
  const attrs: string[] = [];

  for (const [key, value] of Object.entries(node.props)) {
    if (handledKeys.has(key)) continue;
    const dataKey = `data-${key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
    if (typeof value === "string") attrs.push(` ${dataKey}=${jsxString(value)}`);
    else if (typeof value === "number") attrs.push(` ${dataKey}={${value}}`);
    else if (typeof value === "boolean") attrs.push(` ${dataKey}={${value}}`);
    // Object/array-valued props aren't representable as a plain JSX attribute — they remain
    // available on the returned ReactComponentNode.props for any downstream consumer, just not
    // inlined into the generated TSX text.
  }

  return attrs.join("");
}

function renderChildren(node: ReactComponentNode, context: RenderContext, indent: string): string {
  if (node.children.length === 0) return "";
  return node.children.map((child) => renderComponent(child, context, `${indent}  `)).join("\n");
}

function renderButton(node: ReactComponentNode, context: RenderContext, indent: string): string {
  const text = isNonEmptyString(node.props.text) ? node.props.text : "Button";
  const disabled = node.props.disabled === true ? " disabled" : "";

  if (isNonEmptyString(node.props.href)) {
    context.imports.add("Link");
    return `${indent}<Link href=${jsxString(node.props.href)}${classAttr(node.className)}${eventAttrs(node)}>${jsxString(
      text
    )}</Link>`;
  }

  return `${indent}<button${classAttr(node.className)}${eventAttrs(node)}${disabled}>${jsxString(text)}</button>`;
}

function renderImage(node: ReactComponentNode, context: RenderContext, indent: string): string {
  context.imports.add("Image");
  const src = isNonEmptyString(node.props.src) ? node.props.src : "";
  const alt = isNonEmptyString(node.props.alt) ? node.props.alt : ""; // TODO: alt text missing from DesignDocument
  const width = typeof node.props.width === "number" ? node.props.width : 800;
  const height = typeof node.props.height === "number" ? node.props.height : 600;
  const objectFit = isNonEmptyString(node.props.objectFit) ? node.props.objectFit : undefined;
  const style = objectFit ? ` style={{ objectFit: ${JSON.stringify(objectFit)} }}` : "";

  return `${indent}<Image src=${jsxString(src)} alt=${jsxString(alt)} width={${width}} height={${height}}${classAttr(
    node.className
  )}${style} />`;
}

function renderNavbar(node: ReactComponentNode, context: RenderContext, indent: string): string {
  const items = Array.isArray(node.props.items) ? (node.props.items as Array<{ label?: unknown; href?: unknown }>) : [];
  const logo = isNonEmptyString(node.props.logo) ? node.props.logo : undefined;

  const linkItems = items
    .filter((item) => isNonEmptyString(item.href))
    .map((item) => {
      context.imports.add("Link");
      const label = isNonEmptyString(item.label) ? item.label : "";
      return `${indent}    <Link href=${jsxString(item.href)}>${jsxString(label)}</Link>`;
    })
    .join("\n");

  const logoMarkup = logo ? `${indent}  <span className="font-bold">${jsxString(logo)}</span>\n` : "";

  return `${indent}<nav${classAttr(node.className)}${eventAttrs(node)}>
${logoMarkup}${indent}  <div className="flex gap-4">
${linkItems}
${indent}  </div>
${indent}</nav>`;
}

interface FormFieldLike {
  name?: unknown;
  label?: unknown;
  type?: unknown;
  required?: unknown;
  placeholder?: unknown;
}

function renderForm(node: ReactComponentNode, _context: RenderContext, indent: string): string {
  const fields = Array.isArray(node.props.fields) ? (node.props.fields as FormFieldLike[]) : [];

  const fieldMarkup = fields
    .filter((field) => isNonEmptyString(field.name))
    .map((field) => {
      const type = isNonEmptyString(field.type) ? field.type : "text";
      const label = isNonEmptyString(field.label) ? field.label : field.name;
      const required = field.required === true ? " required" : "";
      const placeholder = isNonEmptyString(field.placeholder) ? ` placeholder=${jsxString(field.placeholder)}` : "";

      return `${indent}  <label className="flex flex-col gap-1">
${indent}    ${jsxString(label)}
${indent}    <input type=${jsxString(type)} name=${jsxString(field.name)}${placeholder}${required} />
${indent}  </label>`;
    })
    .join("\n");

  // submitAction/validation reference business logic (an action identifier + rules), which this
  // generator never implements — see the TODO submit-handler stub declared at the page level.
  // componentTree.ts guarantees a form always carries an onSubmit handler name (and a matching
  // page-level stub), so this never falls back to an undeclared identifier.
  return `${indent}<form${classAttr(node.className)} onSubmit={${node.events.onSubmit ?? node.events.onClick}}>
${fieldMarkup}
${indent}  <button type="submit">Submit</button>
${indent}</form>`;
}

function renderGeneric(node: ReactComponentNode, context: RenderContext, indent: string): string {
  const text = isNonEmptyString(node.props.text) ? `${indent}  ${jsxString(node.props.text)}\n` : "";
  const children = renderChildren(node, context, indent);
  const inner = [text.trimEnd(), children].filter(Boolean).join("\n");
  const attrs = `${classAttr(node.className)}${eventAttrs(node)}${passthroughAttrs(node, PASSTHROUGH_HANDLED_KEYS)}`;

  if (!inner) return `${indent}<${node.tag}${attrs} />`;
  return `${indent}<${node.tag}${attrs}>\n${inner}\n${indent}</${node.tag}>`;
}

/**
 * Wireframe landmark renderers (2026-09-08).
 *
 * `node.sourceType` is the standard 18-value DesignComponentType ("container"/"card"/"grid"/…) —
 * too coarse to tell a page Header apart from its Footer, both of which
 * `claude-design-document-adapter.ts`'s `WIREFRAME_TO_DESIGN_COMPONENT` map to "container". Every
 * such node still carries the *original* Wireframe landmark type (Header/Navigation/Sidebar/Hero/
 * Card/Table/Dashboard/Footer/Modal/Search/Pagination — Button and Form are excluded here because
 * they already map to DesignComponentTypes with a real dedicated renderer above) as
 * `node.props.sourceType`, which `renderComponent()` checks first. Without this, every one of
 * those landmarks rendered as an empty `<div data-source-type="Header" />` — structurally correct
 * (right element, right position, right order — that part came from the Wireframe/Prototype chain
 * and is unchanged) but visually nothing, since neither Wireframe nor Prototype carry marketing
 * copy. These renderers exist to make a Wireframe Board edit look like a page, not fix that copy
 * gap — every string below is a generic placeholder label, not content generation; an Adapter
 * populating real `Component.props` (text/items/fields, already-handled per-type above) always
 * takes priority over a landmark's own hardcoded copy where the two could conflict, but today's
 * Wireframe chain never sets those for these types, so in practice a landmark always renders its
 * placeholder.
 */

function mergeClass(defaultClass: string, nodeClass: string): string {
  return [defaultClass, nodeClass].filter(Boolean).join(" ");
}

function dataSourceTypeAttr(node: ReactComponentNode): string {
  return isNonEmptyString(node.props.sourceType) ? ` data-source-type=${jsxString(node.props.sourceType)}` : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface WireframeNavItem {
  label: string;
  href: string;
}

/** `design-content-enrichment.ts` sets this from the DesignDocument's own page list when the
 *  landmark came from a real Wireframe (real screens, not invented) — absent for anything else
 *  (hand-authored documents, or a landmark rendered without going through that enrichment step). */
function navItemsProp(node: ReactComponentNode): WireframeNavItem[] | null {
  const value = node.props.navItems;
  if (!Array.isArray(value)) return null;
  const items = value.filter(
    (item): item is WireframeNavItem => isRecord(item) && isNonEmptyString(item.label) && isNonEmptyString(item.href)
  );
  return items.length > 0 ? items : null;
}

function renderNavItems(items: WireframeNavItem[], context: RenderContext, indent: string): string {
  return items
    .map((item) => {
      context.imports.add("Link");
      return `${indent}<Link href=${jsxString(item.href)}>${jsxString(item.label)}</Link>`;
    })
    .join("\n");
}

const PLACEHOLDER_NAV_MARKUP = (indent: string) =>
  [`${indent}<span>메뉴 1</span>`, `${indent}<span>메뉴 2</span>`, `${indent}<span>메뉴 3</span>`].join("\n");

function renderWireframeHeader(node: ReactComponentNode, context: RenderContext, indent: string): string {
  const cls = mergeClass("flex flex-wrap items-center justify-between gap-4 py-4", node.className);
  const logo = isNonEmptyString(node.props.logo) ? node.props.logo : "로고";
  const items = navItemsProp(node);
  const navMarkup = items ? renderNavItems(items, context, `${indent}    `) : PLACEHOLDER_NAV_MARKUP(`${indent}    `);
  return `${indent}<header${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${indent}  <span className="text-lg font-bold text-slate-900">${jsxString(logo)}</span>
${indent}  <nav className="flex gap-6 text-sm text-slate-600">
${navMarkup}
${indent}  </nav>
${indent}</header>`;
}

function renderWireframeNavigation(node: ReactComponentNode, context: RenderContext, indent: string): string {
  const cls = mergeClass("flex flex-wrap gap-6 text-sm text-slate-600", node.className);
  const items = navItemsProp(node);
  const navMarkup = items ? renderNavItems(items, context, `${indent}  `) : PLACEHOLDER_NAV_MARKUP(`${indent}  `);
  return `${indent}<nav${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${navMarkup}
${indent}</nav>`;
}

function renderWireframeSidebar(node: ReactComponentNode, context: RenderContext, indent: string): string {
  const cls = mergeClass("flex w-full flex-col gap-2 text-sm text-slate-600 sm:w-56", node.className);
  const items = navItemsProp(node);
  const navMarkup = items ? renderNavItems(items, context, `${indent}  `) : PLACEHOLDER_NAV_MARKUP(`${indent}  `);
  return `${indent}<aside${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${navMarkup}
${indent}</aside>`;
}

function renderWireframeHero(node: ReactComponentNode, _context: RenderContext, indent: string): string {
  const cls = mergeClass("flex flex-col items-center gap-4 py-12 text-center", node.className);
  const headline = isNonEmptyString(node.props.headline) ? node.props.headline : "핵심 메시지를 입력하세요";
  const subheadline = isNonEmptyString(node.props.subheadline)
    ? node.props.subheadline
    : "방문자에게 전달하고 싶은 한 문장을 여기에 작성합니다.";
  const ctaLabel = isNonEmptyString(node.props.ctaLabel) ? node.props.ctaLabel : "자세히 보기";
  return `${indent}<div${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${indent}  <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">${jsxString(headline)}</h1>
${indent}  <p className="max-w-xl text-slate-600">${jsxString(subheadline)}</p>
${indent}  <button className="rounded bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">${jsxString(ctaLabel)}</button>
${indent}</div>`;
}

function renderWireframeCard(node: ReactComponentNode, _context: RenderContext, indent: string): string {
  const cls = mergeClass("rounded-lg border border-slate-200 p-6", node.className);
  const title = isNonEmptyString(node.props.title) ? node.props.title : "카드 제목";
  const description = isNonEmptyString(node.props.description) ? node.props.description : "카드 설명 텍스트가 들어갑니다.";
  return `${indent}<div${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${indent}  <h3 className="text-lg font-bold text-slate-900">${jsxString(title)}</h3>
${indent}  <p className="mt-2 text-sm text-slate-600">${jsxString(description)}</p>
${indent}</div>`;
}

function renderWireframeTable(node: ReactComponentNode, _context: RenderContext, indent: string): string {
  const cls = mergeClass("w-full border-collapse text-left text-sm", node.className);
  return `${indent}<table${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${indent}  <thead>
${indent}    <tr className="border-b border-slate-200 text-slate-900">
${indent}      <th className="py-2 pr-4 font-semibold">항목</th>
${indent}      <th className="py-2 pr-4 font-semibold">값</th>
${indent}    </tr>
${indent}  </thead>
${indent}  <tbody className="text-slate-600">
${indent}    <tr className="border-b border-slate-100">
${indent}      <td className="py-2 pr-4">데이터 1</td>
${indent}      <td className="py-2 pr-4">-</td>
${indent}    </tr>
${indent}    <tr>
${indent}      <td className="py-2 pr-4">데이터 2</td>
${indent}      <td className="py-2 pr-4">-</td>
${indent}    </tr>
${indent}  </tbody>
${indent}</table>`;
}

function renderWireframeDashboard(node: ReactComponentNode, _context: RenderContext, indent: string): string {
  const cls = mergeClass("grid grid-cols-2 gap-4 sm:grid-cols-4", node.className);
  const stat = (label: string) => `${indent}  <div className="rounded-lg border border-slate-200 p-4">
${indent}    <p className="text-xs text-slate-500">${label}</p>
${indent}    <p className="text-2xl font-bold text-slate-900">-</p>
${indent}  </div>`;
  return `${indent}<div${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${stat("지표 1")}
${stat("지표 2")}
${indent}</div>`;
}

function renderWireframeFooter(node: ReactComponentNode, _context: RenderContext, indent: string): string {
  const cls = mergeClass("flex flex-col items-center gap-2 py-8 text-sm text-slate-500", node.className);
  const text = isNonEmptyString(node.props.text) ? node.props.text : "© 2026 Company Name. All rights reserved.";
  return `${indent}<footer${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${indent}  <span>${jsxString(text)}</span>
${indent}</footer>`;
}

function renderWireframeModal(node: ReactComponentNode, _context: RenderContext, indent: string): string {
  // A real open/close toggle is interaction wiring the Wireframe/Prototype chain never carries
  // (no business logic is generated by React Generator, same principle as the form's TODO stub)
  // — this renders the panel a Modal would show, always visible, as a static layout preview.
  const cls = mergeClass("rounded-lg border border-slate-200 bg-white p-6 shadow-lg", node.className);
  return `${indent}<div${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${indent}  <h3 className="text-lg font-bold text-slate-900">팝업 제목</h3>
${indent}  <p className="mt-2 text-sm text-slate-600">팝업 내용이 들어갑니다.</p>
${indent}  <button className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">확인</button>
${indent}</div>`;
}

function renderWireframeSearch(node: ReactComponentNode, _context: RenderContext, indent: string): string {
  const cls = mergeClass("flex gap-2", node.className);
  return `${indent}<div${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${indent}  <input type="search" placeholder="검색어를 입력하세요" className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm" />
${indent}  <button className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">검색</button>
${indent}</div>`;
}

function renderWireframePagination(node: ReactComponentNode, _context: RenderContext, indent: string): string {
  const cls = mergeClass("flex justify-center gap-2 text-sm", node.className);
  const page = (label: string) => `${indent}  <button className="rounded border border-slate-300 px-3 py-1.5">${label}</button>`;
  return `${indent}<nav${classAttr(cls)}${eventAttrs(node)}${dataSourceTypeAttr(node)}>
${page("1")}
${page("2")}
${page("3")}
${indent}</nav>`;
}

const WIREFRAME_LANDMARK_RENDERERS: Readonly<
  Record<string, (node: ReactComponentNode, context: RenderContext, indent: string) => string>
> = {
  Header: renderWireframeHeader,
  Navigation: renderWireframeNavigation,
  Sidebar: renderWireframeSidebar,
  Hero: renderWireframeHero,
  Card: renderWireframeCard,
  Table: renderWireframeTable,
  Dashboard: renderWireframeDashboard,
  Footer: renderWireframeFooter,
  Modal: renderWireframeModal,
  Search: renderWireframeSearch,
  Pagination: renderWireframePagination,
};

const PASSTHROUGH_HANDLED_KEYS = new Set([
  "text",
  "href",
  "src",
  "alt",
  "width",
  "height",
  "objectFit",
  "items",
  "logo",
  "sticky",
  "fields",
  "submitAction",
  "validation",
  "variant",
  "size",
  "icon",
  "disabled",
]);

function renderComponent(node: ReactComponentNode, context: RenderContext, indent: string): string {
  const wireframeSourceType = node.props.sourceType;
  const landmarkRenderer =
    isNonEmptyString(wireframeSourceType) ? WIREFRAME_LANDMARK_RENDERERS[wireframeSourceType] : undefined;
  if (landmarkRenderer) return landmarkRenderer(node, context, indent);

  switch (node.sourceType) {
    case "button":
      return renderButton(node, context, indent);
    case "image":
      return renderImage(node, context, indent);
    case "navbar":
      return renderNavbar(node, context, indent);
    case "form":
      return renderForm(node, context, indent);
    default:
      return renderGeneric(node, context, indent);
  }
}

function renderSection(section: ReactSectionNode, context: RenderContext, indent: string): string {
  const inner = section.components.map((component) => renderComponent(component, context, `${indent}  `)).join("\n");
  const body = inner ? `\n${inner}\n${indent}` : "";
  return `${indent}<${section.tag}${classAttr(section.className)}>${body}</${section.tag}>`;
}

function renderStub(stub: ReactEventStub): string {
  return `function ${stub.name}() {
  // TODO: implement "${stub.sourceAction}" — no business logic is generated by React Generator.
}`;
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") || "Page";
}

/**
 * Renders a single page's full Next.js App Router TSX source. `stubs` should be exactly the
 * event stubs collected while mapping this page (componentTree.ts's `PageMapResult.stubs`).
 */
export function renderPageTsx(structure: ReactPageStructure, stubs: ReactEventStub[]): string {
  const context: RenderContext = { imports: new Set() };
  const sectionsMarkup = structure.sections.map((section) => renderSection(section, context, "      ")).join("\n");

  // Deduplicate stub names — a component's own id is already unique, but keep this defensive.
  const uniqueStubs = [...new Map(stubs.map((stub) => [stub.name, stub])).values()];

  // Any stub means the page binds a DOM event handler. In the App Router that only works in a
  // Client Component, and Next.js rejects a `metadata` export from a module marked "use client"
  // — so the two are mutually exclusive and the directive decides which one this page gets.
  // Pages with no interaction stay Server Components and keep their metadata.
  const isClientComponent = uniqueStubs.length > 0;

  const importLines = [
    ...(isClientComponent ? [] : ['import type { Metadata } from "next";']),
    ...(context.imports.has("Image") ? ['import Image from "next/image";'] : []),
    ...(context.imports.has("Link") ? ['import Link from "next/link";'] : []),
  ].join("\n");

  const directive = isClientComponent ? '"use client";\n\n' : "";
  const metadataBlock = isClientComponent
    ? ""
    : `\nexport const metadata: Metadata = {\n  title: ${JSON.stringify(structure.title)},\n};\n`;
  const stubsBlock = uniqueStubs.length > 0 ? `\n${uniqueStubs.map(renderStub).join("\n\n")}\n` : "";

  const componentName = toPascalCase(structure.title || structure.id);
  const header = importLines ? `${importLines}\n` : "";

  return `${directive}${header}${metadataBlock}${stubsBlock}
export default function ${componentName}Page() {
  return (
    <main${classAttr(structure.className)}>
${sectionsMarkup}
    </main>
  );
}
`;
}
