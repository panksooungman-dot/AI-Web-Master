import type { DesignPlanRecord } from "./types";
import { WEBSITE_TYPES, type WebsiteTypeId } from "@/lib/websites/types";

/**
 * Design Automation — Phase 9 (docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md 2번의 Phase 구분,
 * `DESIGN_WORKFLOW.md` Phase 11~14 "Website Builder 연동"). Website Builder v2
 * (`packages/cli/src/website/*`, `ai website create`)는 이미 완성되어 있고
 * Dashboard(`app/api/websites/route.ts`)도 이미 이를 child process로 재사용하고 있다 — 이
 * 파일은 새 생성 엔진이 아니라, Phase 1(Design Plan)의 Requirement Analysis 입력값을
 * Website Builder가 요구하는 인자 형태로 옮기기만 하는 순수 매핑 계층(fs 의존성 없음)이다.
 */

export interface WebsiteBuildInputs {
  name: string;
  businessType: string;
  audience: string;
  brand: string;
  language: string;
  siteType: WebsiteTypeId;
  /**
   * Requirement Analysis·Feature List·Customer Requirements 원문을 Content Engine에 전달할
   * 수 있는 형태로 정리한 것(있으면). 지금까지는 Design Plan의 이 상세 분석 내용이 페이지
   * 구조(DesignDocument)를 결정하는 데만 쓰이고, 실제 콘텐츠를 쓰는 Content Engine에는
   * businessType/targetUsers 같은 짧은 값만 전달되어 최종 결과물에 전혀 반영되지 않는
   * 단절이 있었다(2026-09-17, 실사용 중 발견). `buildAdditionalContext()`가 채워 넣는다.
   */
  additionalContext?: string;
}

/**
 * Design Plan의 Requirement Analysis·Feature List·Customer Requirements(고객 요구사항 원문)를
 * Content Engine 프롬프트에 그대로 붙여 넣을 수 있는 하나의 텍스트로 정리한다. 새로운 AI 호출
 * 없이 이미 Phase 1에서 생성·저장된 값만 재사용하는 순수 함수 — 존재하는 정보만 포함하고
 * (비어있는 섹션은 건너뜀), 지어내는 값은 전혀 없다.
 */
export function buildAdditionalContext(plan: DesignPlanRecord): string {
  const sections: string[] = [];

  const summary = plan.content.requirementAnalysis.projectSummary.trim();
  if (summary) sections.push(`Project summary: ${summary}`);

  const requirements = plan.input.requirements.trim();
  if (requirements) sections.push(`Customer requirements (verbatim): ${requirements}`);

  const features = plan.content.featureList
    .map((feature) => `- ${feature.name.trim()}: ${feature.description.trim()}`)
    .filter((line) => line !== "- :");
  if (features.length > 0) sections.push(`Key features:\n${features.join("\n")}`);

  return sections.join("\n\n");
}

/**
 * `lib/websites/types.ts`의 기존 WEBSITE_TYPES(Website Builder Dashboard가 이미 쓰는 동일한
 * 11종 목록, 새 분류 체계 아님)와 대조해 Design Plan의 자유 텍스트 `projectType`을 매핑한다.
 * 1) 정확히 id와 일치(대소문자 무시) 2) 한글 라벨이 부분 문자열로 포함(예: "치과 웹사이트" →
 * "치과" → dental) 3) 둘 다 아니면 CLI의 `resolveSiteType()`과 동일하게 "website"로 폴백한다.
 * AI 호출이나 새로운 추론 로직을 추가하지 않는다 — 결정론적 문자열 매칭뿐이다.
 */
export function inferSiteType(projectType: string): WebsiteTypeId {
  const normalized = projectType.trim().toLowerCase();
  if (!normalized) return "website";

  const byId = WEBSITE_TYPES.find((type) => type.id === normalized);
  if (byId) return byId.id;

  const byLabel = WEBSITE_TYPES.filter((type) => type.id !== "website").find((type) =>
    projectType.includes(type.label)
  );
  if (byLabel) return byLabel.id;

  return "website";
}

/**
 * Design Plan(Phase 1)의 Requirement Analysis 입력값을 Website Builder(`ai website create`)의
 * 인자로 변환한다. `app/api/websites/route.ts`가 이미 정의한 필드 이름(name/businessType/
 * audience/brand/language/siteType)을 그대로 따른다 — 같은 CLI 호출 계약을 공유하기 위함이다.
 */
export function planToWebsiteBuildInputs(plan: DesignPlanRecord): WebsiteBuildInputs {
  const additionalContext = buildAdditionalContext(plan);

  return {
    name: plan.input.projectName,
    businessType: plan.input.projectType,
    audience: plan.input.targetUsers,
    brand: plan.input.projectName,
    language: "Korean",
    siteType: inferSiteType(plan.input.projectType),
    ...(additionalContext ? { additionalContext } : {}),
  };
}
