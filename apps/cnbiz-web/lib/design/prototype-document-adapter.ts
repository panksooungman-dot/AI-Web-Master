import type { DesignDocument, Page } from "@cnbiz/design-system/types/design";
import { DESIGN_DOCUMENT_VERSION, slugifyPath } from "./design-document-adapter";
import type { ComponentType, WireframeRecord } from "./wireframe";

/**
 * Design JSON Standardization — Phase 5 (docs/architecture/DESIGN_JSON_SPEC.md).
 * Prototype Generator(prototype-generator.ts)의 입력을 Phase 3 전용 타입(WireframeRecord)
 * 대신 표준 DesignDocument 기준으로 재구성하는 Adapter(Phase 3의 storyboard-document-adapter.ts,
 * Phase 4의 wireframe-document-adapter.ts와 동일한 패턴). `document.pages`(id/title/path)가 화면
 * 구조의 기준(backbone)이 되고, 아직 DesignDocument 스키마에 없는 화면별 컴포넌트 구성은 Phase 3
 * 원본 `wireframe.content.layouts`에서 path로 매칭해 보강한다.
 *
 * WireframeRecord는 Phase 1 DesignPlanRecord를 `planId`(문자열 참조)로만 가리키고 있어(Design
 * JSON 문서를 직접 들고 있지 않음), 이 Adapter는 registry 조회 없이(Registry·API 변경 금지 원칙)
 * `layouts`로부터 DesignDocument를 새로 합성한다 — Phase 4의 wireframeToDesignDocument()와 동일한
 * 이유로 `metadata`는 실제 프로젝트 이름이 아닌 구조적 placeholder다(Prototype 로직 어디서도
 * metadata를 읽지 않으므로 무해함).
 *
 * Page.sections는 Phase 3까지도 여전히 비어 있다(Transitional Bridge, Phase 2~4와 동일한 이유 —
 * DesignDocument 스키마에는 아직 컴포넌트 인벤토리를 실을 자리가 없다). 이 값은 정상이며, 화면별
 * 컴포넌트 구성은 이 Adapter 내부에서만 Phase 3 원본(`wireframe.content.layouts[].desktop.sections`)
 * 으로부터 브릿지된다 — Prototype Generator 자신은 `wireframe.content`를 절대 직접 읽지 않는다.
 */

export interface PrototypeScreenSource {
  screen: string;
  path: string;
  components: ComponentType[];
}

export interface PrototypeSource {
  document: DesignDocument;
  screens: PrototypeScreenSource[];
}

function componentsForLayout(layout: WireframeRecord["content"]["layouts"][number]): ComponentType[] {
  return [...new Set(layout.desktop.sections.flatMap((section) => section.components))];
}

/**
 * WireframeRecord → DesignDocument. Phase 1 DesignPlanRecord에 접근할 수 없으므로(registry
 * 조회 금지) metadata는 구조적 placeholder로 채운다 — pages(id/title/path)만 실제 데이터다.
 */
export function wireframeToDesignDocument(wireframe: WireframeRecord): DesignDocument {
  const pages: Page[] = wireframe.content.layouts.map((layout) => ({
    id: slugifyPath(layout.path),
    title: layout.screen,
    path: layout.path,
    // Phase 3까지는 DesignDocument 스키마에 컴포넌트 인벤토리를 실을 자리가 없으므로 비워 둔다
    // (Transitional Bridge). 실제 컴포넌트 구성은 아래 screens[].components로만 전달한다.
    sections: [],
  }));

  return {
    version: DESIGN_DOCUMENT_VERSION,
    metadata: {
      projectId: wireframe.planId,
      projectName: `Project ${wireframe.planId}`,
      createdAt: wireframe.createdAt,
      updatedAt: wireframe.createdAt,
    },
    theme: {
      colors: {},
      typography: {},
      spacing: {},
      radius: {},
      shadow: {},
    },
    pages,
  };
}

/**
 * Prototype Generator가 실제로 소비하는 입력. `document.pages`가 화면 구조의 기준이고,
 * components는 Phase 3 원본에서 path로 매칭해 보강한 값이다(Adapter 내부 전용 — 생성 로직은
 * `wireframe.content`를 직접 읽지 않고 이 값만 사용한다).
 */
export function wireframeToPrototypeSource(wireframe: WireframeRecord): PrototypeSource {
  const document = wireframeToDesignDocument(wireframe);
  const componentsByPath = new Map(
    wireframe.content.layouts.map((layout) => [layout.path, componentsForLayout(layout)])
  );

  const screens: PrototypeScreenSource[] = document.pages.map((page) => ({
    screen: page.title,
    path: page.path,
    components: componentsByPath.get(page.path) ?? [],
  }));

  return { document, screens };
}
