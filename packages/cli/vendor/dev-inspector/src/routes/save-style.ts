import { NextResponse } from "next/server";
import fs from "node:fs";
import ts from "typescript";
import { resolveSafeSourcePath } from "../safe-source-path";

/**
 * 색상·여백 등 style 속성 저장 API.
 *
 * TypeScript Compiler API로 .tsx 파일을 AST로 파싱해 대상 JSX 요소를 정확히
 * 찾아낸다(정규식 텍스트 치환 대신). className 값(anchor)이 파일 내에서 정확히
 * 1번만 발견될 때만 저장하며, 이미 존재하는 style={{...}} 객체는 병합하고,
 * 없으면 새로 추가한다. 원본 텍스트는 대상 구간만 잘라 교체하므로 나머지
 * 포맷은 그대로 보존된다.
 */

const ALLOWED_STYLE_KEYS = new Set(["color", "backgroundColor", "margin", "padding"]);

interface SaveStyleRequest {
  file?: string;
  anchor?: string;
  styles?: Record<string, string>;
}

function formatObjectLiteral(entries: [string, string][]): string {
  const body = entries.map(([key, value]) => `${key}: ${value}`).join(", ");
  return `{ ${body} }`;
}

export async function saveStyleHandler(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, reason: "disabled" }, { status: 403 });
  }

  let body: SaveStyleRequest;
  try {
    body = (await request.json()) as SaveStyleRequest;
  } catch {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const { file, anchor, styles } = body;

  if (typeof file !== "string" || typeof anchor !== "string" || !anchor || !styles) {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const styleEntries = Object.entries(styles).filter(
    (entry): entry is [string, string] =>
      ALLOWED_STYLE_KEYS.has(entry[0]) && typeof entry[1] === "string"
  );

  if (styleEntries.length === 0) {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const absolutePath = resolveSafeSourcePath(file);
  if (!absolutePath) {
    return NextResponse.json({ success: false, reason: "invalid-file" }, { status: 400 });
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    absolutePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const matches: ts.JsxAttribute[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sourceFile) === "className" &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      node.initializer.text === anchor
    ) {
      matches.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (matches.length === 0) {
    return NextResponse.json({ success: false, reason: "not-found" });
  }
  if (matches.length > 1) {
    return NextResponse.json({ success: false, reason: "ambiguous", occurrences: matches.length });
  }

  const classNameAttr = matches[0];
  const attributes = classNameAttr.parent;
  if (!ts.isJsxAttributes(attributes)) {
    return NextResponse.json({ success: false, reason: "invalid-file" }, { status: 400 });
  }

  const styleAttr = attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(sourceFile) === "style"
  );

  const newEntries = styleEntries.map(
    ([key, value]) => [key, JSON.stringify(value)] as [string, string]
  );

  let updatedContent: string;

  if (styleAttr) {
    const expr =
      styleAttr.initializer && ts.isJsxExpression(styleAttr.initializer)
        ? styleAttr.initializer.expression
        : undefined;

    if (!expr || !ts.isObjectLiteralExpression(expr)) {
      return NextResponse.json({ success: false, reason: "unsupported-style" });
    }

    const isSimple = expr.properties.every(
      (p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)
    );
    if (!isSimple) {
      return NextResponse.json({ success: false, reason: "unsupported-style" });
    }

    const existing = new Map<string, string>();
    for (const prop of expr.properties) {
      const assignment = prop as ts.PropertyAssignment;
      existing.set(
        (assignment.name as ts.Identifier).text,
        assignment.initializer.getText(sourceFile)
      );
    }
    for (const [key, valueText] of newEntries) {
      existing.set(key, valueText);
    }

    const replacement = formatObjectLiteral(Array.from(existing.entries()));
    const start = expr.getStart(sourceFile);
    const end = expr.getEnd();
    updatedContent = content.slice(0, start) + replacement + content.slice(end);
  } else {
    const insertPos = classNameAttr.getEnd();
    const insertText = ` style={${formatObjectLiteral(newEntries)}}`;
    updatedContent = content.slice(0, insertPos) + insertText + content.slice(insertPos);
  }

  fs.writeFileSync(absolutePath, updatedContent, "utf-8");

  return NextResponse.json({ success: true, changed: true });
}
