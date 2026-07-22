import type { DesignDocument, Page } from "@cnbiz/design-system/types/design";
import { DESIGN_DOCUMENT_VERSION, slugifyPath } from "./design-document-adapter";
import type { StoryboardRecord } from "./storyboard";

/**
 * Design JSON Standardization — Phase 4 (docs/architecture/DESIGN_JSON_SPEC.md).
 * Wireframe Generator(wireframe-generator.ts)의 입력을 Phase 2 전용 타입(StoryboardRecord)
 * 대신 표준 DesignDocument 기준으로 재구성하는 Adapter(Phase 3의
 * storyboard-document-adapter.ts와 동일한 패턴). `document.pages`(id/title/path)가 화면
 * 구조의 기준(backbone)이 되고, 아직 DesignDocument 스키마에 없는 구성요소(keyElements)는
 * Phase 2 원본 `storyboard.content.screenDescriptions`에서 path로 매칭해 보강한다.
 *
 * StoryboardRecord는 Phase 1 DesignPlanRecord를 `planId`(문자열 참조)로만 가리키고 있어(Phase 2
 * Design JSON 문서를 직접 들고 있지 않음), 이 Adapter는 registry 조회 없이(Public API·Registry
 * 변경 금지 원칙) `screenDescriptions`로부터 DesignDocument를 새로 합성한다. 그 결과 `metadata`는
 * 실제 프로젝트 이름이 아닌 구조적 placeholder다(Wireframe 로직 어디서도 metadata를 읽지 않으므로
 * 무해함) — 실제 프로젝트 메타데이터가 필요해지면 Phase 2에서 이미 만든 DesignPlanRecord.document를
 * 체인으로 전달하는 것이 다음 단계의 자연스러운 개선이다.
 *
 * Page.sections는 Phase 2까지도 여전히 비어 있다(Transitional Bridge, Phase 2/3과 동일한 이유 —
 * 시각 디자인은 아직 Wireframe 자신이 만드는 중이므로 입력 문서 쪽에는 존재하지 않는다). 이 값은
 * 정상이며 이후 Phase(Prototype)가 채워 넣을 몫이다.
 */

export interface WireframeScreenSource {
  screen: string;
  path: string;
  keyElements: string[];
}

export interface WireframeSource {
  document: DesignDocument;
  screens: WireframeScreenSource[];
}

/**
 * StoryboardRecord → DesignDocument. Phase 1 DesignPlanRecord에 접근할 수 없으므로(registry
 * 조회 금지) metadata는 구조적 placeholder로 채운다 — pages(id/title/path)만 실제 데이터다.
 */
export function storyboardToDesignDocument(storyboard: StoryboardRecord): DesignDocument {
  const pages: Page[] = storyboard.content.screenDescriptions.map((screen) => ({
    id: slugifyPath(screen.path),
    title: screen.screen,
    path: screen.path,
    // Phase 2까지는 시각 디자인이 없으므로 sections는 비워 둔다(Transitional Bridge).
    sections: [],
  }));

  return {
    version: DESIGN_DOCUMENT_VERSION,
    metadata: {
      projectId: storyboard.planId,
      projectName: `Project ${storyboard.planId}`,
      createdAt: storyboard.createdAt,
      updatedAt: storyboard.createdAt,
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
 * Wireframe Generator가 실제로 소비하는 입력. `document.pages`가 화면 구조의 기준이고,
 * keyElements는 Phase 2 원본에서 path로 매칭해 보강한 값이다(Adapter 내부 전용 — 생성 로직은
 * 이 값을 직접 만들지 않는다).
 */
export function storyboardToWireframeSource(storyboard: StoryboardRecord): WireframeSource {
  const document = storyboardToDesignDocument(storyboard);
  const keyElementsByPath = new Map(
    storyboard.content.screenDescriptions.map((screen) => [screen.path, screen.keyElements])
  );

  const screens: WireframeScreenSource[] = document.pages.map((page) => ({
    screen: page.title,
    path: page.path,
    keyElements: keyElementsByPath.get(page.path) ?? [],
  }));

  return { document, screens };
}
