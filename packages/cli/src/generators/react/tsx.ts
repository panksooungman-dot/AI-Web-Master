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

/** Renders props not specially handled by a type-specific renderer as plain JSX attributes. */
function passthroughAttrs(node: ReactComponentNode, handledKeys: ReadonlySet<string>): string {
  const attrs: string[] = [];

  for (const [key, value] of Object.entries(node.props)) {
    if (handledKeys.has(key)) continue;
    if (typeof value === "string") attrs.push(` ${key}=${jsxString(value)}`);
    else if (typeof value === "number") attrs.push(` ${key}={${value}}`);
    else if (typeof value === "boolean") attrs.push(` ${key}={${value}}`);
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
  return `${indent}<form${classAttr(node.className)} onSubmit={${node.events.onClick ?? `handleSubmit_${node.id}`}}>
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

  const importLines = [
    'import type { Metadata } from "next";',
    ...(context.imports.has("Image") ? ['import Image from "next/image";'] : []),
    ...(context.imports.has("Link") ? ['import Link from "next/link";'] : []),
  ].join("\n");

  // Deduplicate stub names — a component's own id is already unique, but keep this defensive.
  const uniqueStubs = [...new Map(stubs.map((stub) => [stub.name, stub])).values()];
  const stubsBlock = uniqueStubs.length > 0 ? `\n${uniqueStubs.map(renderStub).join("\n\n")}\n` : "";

  const componentName = toPascalCase(structure.title || structure.id);

  return `${importLines}

export const metadata: Metadata = {
  title: ${JSON.stringify(structure.title)},
};
${stubsBlock}
export default function ${componentName}Page() {
  return (
    <main${classAttr(structure.className)}>
${sectionsMarkup}
    </main>
  );
}
`;
}
