import type { DesignDocument, Page, Theme } from "@cnbiz/design-system/types/design";
import { colors, radius, typography } from "@cnbiz/design-system";
import type { DesignPlanRecord, SiteMapNode } from "./types";

/**
 * Design JSON Standardization — Phase 2 (docs/architecture/DESIGN_JSON_SPEC.md).
 * Planning Generator(Phase 1)는 이미 검증된 자체 출력(DesignPlanRecord.content)을 그대로
 * 유지하고, 이 Adapter는 그 위에 표준 DesignDocument 하나를 "추가로" 파생시키기만 한다
 * (Adapter 패턴 — 기존 Generator·API·UI는 전혀 수정하지 않는다).
 *
 * Phase 1은 아직 화면별 시각 디자인(섹션·컴포넌트)을 만들지 않으므로 pages의 sections는 빈
 * 배열로 남긴다 — 있지도 않은 컴포넌트를 추측해서 채워 넣지 않는다(존재하는 정보: siteMap →
 * pages 뼈대만). Wireframe/Prototype 이후 Phase가 이 문서에 sections·components를 채워 넣는다.
 *
 * theme은 Wiring 이후 모든 Phase가 공유한다 — 아래 `buildEnrichedTheme()`은 원래
 * claude-design-document-adapter.ts에만 있던 기존 함수를 이 base 모듈로 그대로 옮긴 것이다
 * (로직 무변경). 이 모듈은 design/ 안의 다른 Adapter를 import하지 않는 유일한 base라서,
 * 네 Adapter 전부가 순환 import 없이 같은 함수 하나를 재사용할 수 있는 위치다.
 *
 * 주의: 이 Adapter는 DesignDocument "형태"의 객체만 만든다(TypeScript 타입 검사로 구조를
 * 보장). packages/design-system/validators/design-validator.ts의 Ajv 기반 런타임 검증은
 * 이번 범위에서 호출하지 않는다 — 그 모듈은 "ajv-formats"가 설치되어 있지 않아 import
 * 시점에 즉시 예외를 던진다(사전 확인 완료, 이 저장소 어디에도 ajv-formats 없음). 새 패키지
 * 설치는 승인 대상이라 이번 작업 범위 밖으로 두고 Remaining Work로 보고한다.
 */

export const DESIGN_DOCUMENT_VERSION = "1.0.0";

/**
 * packages/design-system의 기존 토큰(tokens.ts)을 재사용하고, 없는 항목만 결정론적 기본값으로 보강한다.
 * (원래 claude-design-document-adapter.ts의 module-private 함수 — 내용 변경 없이 이 base 모듈로
 * 옮겨 export만 추가했다. 네 Adapter가 모두 이 하나를 재사용하며, Theme 생성 로직은 이 저장소에
 * 이 함수 하나뿐이다.)
 */
export function buildEnrichedTheme(): Theme {
  return {
    colors: { ...colors },
    typography: { ...typography },
    // tokens.ts에는 spacing 팔레트가 없어 docs/03_DESIGN/DESIGN_SYSTEM.md의 8px Grid 기준값을 사용한다.
    spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", "2xl": "48px", "3xl": "64px" },
    radius: { ...radius, full: "9999px" },
    // tokens.ts에는 shadow 팔레트가 없어 DESIGN_SYSTEM.md의 Small/Medium/Large 기준값을 사용한다.
    shadow: {
      small: "0 1px 2px rgba(0, 0, 0, 0.05)",
      medium: "0 4px 6px rgba(0, 0, 0, 0.1)",
      large: "0 10px 15px rgba(0, 0, 0, 0.15)",
    },
  };
}

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
    theme: buildEnrichedTheme(),
    pages: siteMapToPages(content.siteMap),
  };
}
