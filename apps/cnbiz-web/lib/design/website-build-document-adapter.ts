import type { DesignDocument } from "@cnbiz/design-system/types/design";
import type { DesignPlanRecord } from "./types";
import type { PrototypeRecord } from "./prototype";
import { planToDesignDocument } from "./design-document-adapter";
import { prototypeToDesignDocument } from "./claude-design-document-adapter";
import { planToWebsiteBuildInputs, type WebsiteBuildInputs } from "./website-build-adapter";

/**
 * Design JSON Standardization — Phase 7 (docs/architecture/DESIGN_JSON_SPEC.md).
 * Website Builder(`app/api/design/website/route.ts`, `packages/cli/src/website/*`)를 표준
 * DesignDocument로 옮겨가기 위한 준비 단계 — 이번 Phase에서는 아직 route.ts를 바꾸지 않고
 * (Registry·API Route·Dashboard 수정 금지 원칙), Website Builder가 실제로 필요로 하는 두 종류의
 * 데이터(DesignDocument와 기존 WebsiteBuildInputs)를 조합하는 **Hybrid Source**만 준비한다.
 *
 * 왜 Hybrid인가: DesignDocument는 아직 business type/target audience/project metadata/
 * deployment 설정/template 선택 같은 정보를 담을 자리가 없다(Metadata는
 * projectId/projectName/clientName/createdAt/updatedAt만 허용하는 고정 스키마). 반대로
 * `WebsiteBuildInputs`(website-build-adapter.ts, 기존 파일·무변경)는 이 정보를 이미 정확히
 * 가지고 있다(`planToWebsiteBuildInputs()`). 그래서 이번 Phase는 "DesignDocument로 완전히
 * 대체"가 아니라, 얻을 수 있는 건 DesignDocument에서·아직 없는 건 기존 값에서 가져오는
 * 조합(Hybrid)만 만든다.
 *
 * DesignDocument 출처: Website Builder는 체인의 가장 마지막(Review→ClaudeDesign→Prototype)에서
 * 트리거되므로, Prototype이 있으면 Phase 6에서 이미 sections/theme까지 채워 넣은
 * `prototypeToDesignDocument()`(claude-design-document-adapter.ts, 무변경 재사용)를 그대로
 * 쓴다 — 이 파일이 그 매핑을 다시 구현하지 않는다. Prototype이 아직 없는 이른 단계라면 Phase 2의
 * `planToDesignDocument()`(design-document-adapter.ts, 무변경 재사용 — pages만 있는 뼈대)로
 * 폴백한다. 이 Adapter 자신은 registry를 조회하지 않는 순수 함수다(다른 모든 *-document-adapter.ts와
 * 동일한 원칙) — 호출자가 이미 가져온 레코드를 인자로 전달한다.
 */

export interface WebsiteBuildHybridSource {
  /** DesignDocument에서 가져올 수 있는 전부 — pages/sections/components/theme(typography/colors/spacing/radius). */
  document: DesignDocument;
  /** 편의 별칭 — Website Builder가 페이지 구조를 참조할 때 `source.document.pages`를 매번 되짚지 않도록. */
  pages: DesignDocument["pages"];
  /** 편의 별칭 — typography/colors/spacing/radius/shadow 토큰 묶음. */
  theme: DesignDocument["theme"];
  /**
   * DesignDocument에 아직 자리가 없는 정보(business type/target audience/project metadata/
   * template 선택) — 기존 website-build-adapter.ts의 `planToWebsiteBuildInputs()` 그대로.
   * deployment 설정은 이 저장소에 아직 별도 필드로 존재하지 않아(WebsiteBuildInputs에도 없음)
   * 이번 Hybrid Source에도 포함하지 않는다 — Remaining Work 참고.
   */
  inputs: WebsiteBuildInputs;
}

/**
 * plan(+ 있으면 prototype)으로부터 Website Builder용 Hybrid Source를 조합한다. 새로운 생성 로직을
 * 추가하지 않고 기존 두 Adapter(planToDesignDocument/prototypeToDesignDocument,
 * planToWebsiteBuildInputs)를 그대로 재사용만 한다 — 이 함수 자체는 아무것도 새로 계산하지 않는다.
 */
export function buildWebsiteBuildHybridSource(
  plan: DesignPlanRecord,
  prototype?: PrototypeRecord | null
): WebsiteBuildHybridSource {
  const document = prototype ? prototypeToDesignDocument(prototype) : planToDesignDocument(plan);
  const inputs = planToWebsiteBuildInputs(plan);

  return { document, pages: document.pages, theme: document.theme, inputs };
}
