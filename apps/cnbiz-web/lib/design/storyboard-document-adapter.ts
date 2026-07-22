import type { DesignDocument } from "@cnbiz/design-system/types/design";
import { planToDesignDocument } from "./design-document-adapter";
import type { DesignPlanRecord } from "./types";

/**
 * Design JSON Standardization — Phase 3 (docs/architecture/DESIGN_JSON_SPEC.md).
 * Storyboard Generator(storyboard-generator.ts)의 입력을 Phase 1 전용 타입(DesignPlanRecord)
 * 대신 표준 DesignDocument 기준으로 재구성하는 Adapter. `document.pages`(id/title/path)가 화면
 * 구조의 기준(backbone)이 되고, 아직 DesignDocument 스키마에 없는 설명(description)·구성요소
 * (components)는 Phase 1 원본 `plan.content.screenList`에서 path로 매칭해 보강한다 — Phase 1
 * Adapter(design-document-adapter.ts)는 Phase 1이 아직 시각 디자인을 만들지 않으므로 매 Page의
 * `sections`를 항상 빈 배열로 남기기 때문이다(Wireframe/Prototype 단계가 채워 넣기 전까지의
 * 알려진 과도기적 한계). 이 파일은 그 한계를 감안한 브릿지일 뿐, 새 생성 로직은 아니다.
 */

export interface StoryboardScreenSource {
  screen: string;
  path: string;
  description: string;
  components: string[];
}

export interface StoryboardSource {
  document: DesignDocument;
  projectName: string;
  projectSummary: string;
  targetUsers: string[];
  screens: StoryboardScreenSource[];
}

export function planToStoryboardSource(plan: DesignPlanRecord): StoryboardSource {
  const document = plan.document ?? planToDesignDocument(plan);
  const screenByPath = new Map(plan.content.screenList.map((screen) => [screen.path, screen]));

  const screens: StoryboardScreenSource[] = document.pages.map((page) => {
    const original = screenByPath.get(page.path);
    return {
      screen: page.title,
      path: page.path,
      description: original?.description ?? "",
      components: original?.components ?? [],
    };
  });

  return {
    document,
    projectName: document.metadata.projectName,
    projectSummary: plan.content.requirementAnalysis.projectSummary,
    targetUsers: plan.content.requirementAnalysis.targetUsers,
    screens,
  };
}
