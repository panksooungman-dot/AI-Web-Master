import type { DesignDocument, Page } from "@cnbiz/design-system/types/design";
import type { DesignPlanRecord, SiteMapNode } from "./types";

/**
 * Design JSON Standardization — Phase 2 (docs/architecture/DESIGN_JSON_SPEC.md).
 * Planning Generator(Phase 1)는 이미 검증된 자체 출력(DesignPlanRecord.content)을 그대로
 * 유지하고, 이 Adapter는 그 위에 표준 DesignDocument 하나를 "추가로" 파생시키기만 한다
 * (Adapter 패턴 — 기존 Generator·API·UI는 전혀 수정하지 않는다).
 *
 * Phase 1은 아직 시각 디자인(테마·섹션·컴포넌트)을 만들지 않으므로, DesignDocument의 theme은
 * 빈 토큰 세트로, pages의 sections는 빈 배열로 남긴다 — 있지도 않은 컴포넌트를 추측해서
 * 채워 넣지 않는다(존재하는 정보: siteMap → pages 뼈대만). Wireframe/Prototype 이후 Phase가
 * 이 문서에 sections·components·theme을 채워 넣는 것이 자연스러운 다음 단계다.
 *
 * 주의: 이 Adapter는 DesignDocument "형태"의 객체만 만든다(TypeScript 타입 검사로 구조를
 * 보장). packages/design-system/validators/design-validator.ts의 Ajv 기반 런타임 검증은
 * 이번 범위에서 호출하지 않는다 — 그 모듈은 "ajv-formats"가 설치되어 있지 않아 import
 * 시점에 즉시 예외를 던진다(사전 확인 완료, 이 저장소 어디에도 ajv-formats 없음). 새 패키지
 * 설치는 승인 대상이라 이번 작업 범위 밖으로 두고 Remaining Work로 보고한다.
 */

export const DESIGN_DOCUMENT_VERSION = "1.0.0";

/** 다른 Phase의 Adapter(예: wireframe-document-adapter.ts)에서도 재사용하는 공용 slug 규칙. */
export function slugifyPath(pagePath: string): string {
  const trimmed = pagePath.trim();
  if (trimmed === "" || trimmed === "/") return "home";

  const slug = trimmed
    .replace(/^\/+|\/+$/g, "")
    .replace(/\//g, "-")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return slug || "home";
}

/** siteMap은 트리 구조(children)를 가질 수 있으므로 DesignDocument.pages(평면 배열)로 펼친다. */
function flattenSiteMap(nodes: SiteMapNode[]): SiteMapNode[] {
  const result: SiteMapNode[] = [];

  for (const node of nodes) {
    result.push(node);
    if (node.children && node.children.length > 0) {
      result.push(...flattenSiteMap(node.children));
    }
  }

  return result;
}

function siteMapToPages(siteMap: SiteMapNode[]): Page[] {
  const seenPaths = new Set<string>();
  const pages: Page[] = [];

  for (const node of flattenSiteMap(siteMap)) {
    if (seenPaths.has(node.path)) continue;
    seenPaths.add(node.path);

    pages.push({
      id: slugifyPath(node.path),
      title: node.title,
      path: node.path,
      // Phase 1(Planning)은 시각 디자인을 다루지 않으므로 sections는 비워 둔다.
      sections: [],
    });
  }

  return pages;
}

/**
 * DesignPlanRecord(Planning Generator의 기존 출력) → DesignDocument(표준 SSOT).
 * 기존 record.content/record.input은 그대로 두고, 파생된 문서만 별도로 반환한다.
 */
export function planToDesignDocument(
  record: Pick<DesignPlanRecord, "id" | "input" | "content" | "createdAt">
): DesignDocument {
  const { input, content, createdAt } = record;

  return {
    version: DESIGN_DOCUMENT_VERSION,
    metadata: {
      ...(input.projectId ? { projectId: input.projectId } : {}),
      projectName: input.projectName,
      createdAt,
      updatedAt: createdAt,
    },
    theme: {
      colors: {},
      typography: {},
      spacing: {},
      radius: {},
      shadow: {},
    },
    pages: siteMapToPages(content.siteMap),
  };
}
