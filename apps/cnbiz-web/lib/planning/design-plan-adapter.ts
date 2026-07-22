import type { InquiryRecord } from "@/lib/inquiries/types";
import type { DesignPlanInput } from "@/lib/design/types";
import type { PlanningContent } from "./types";

/**
 * Planning(Phase 3) → Design Automation(Phase 1) 데이터 전달. Design Automation은 이미 완결된
 * 시스템이라 수정하지 않는다("Do not modify Design Automation") — 이 파일은 lib/design/
 * website-build-adapter.ts(Phase 1 → Website Builder)와 동일한 원칙의 순수 매핑 계층으로,
 * Design Automation의 기존, 변경되지 않은 진입점(generateDesignPlan()/createDesignPlan(),
 * POST /api/design/requirements)이 요구하는 DesignPlanInput 형태로 Inquiry + Planning 결과를
 * 옮기기만 한다. fs 의존성·AI 호출 없음 — 결정론적 문자열 조합뿐이다.
 *
 * Design Automation Phase 1 진입은 이 저장소의 모든 기존 페이즈 전환과 마찬가지로 사람이
 * 직접 트리거하는 액션으로 유지한다(대시보드의 "Design Automation으로 전달" 버튼이 이 함수의
 * 결과를 기존 POST /api/design/requirements에 그대로 전달) — 모든 Inquiry에 대해 매번 새
 * DesignPlanRecord를 조용히 자동 생성하는 것은 Design Automation의 기존 사용 방식(항상 명시적
 * 트리거)과 다른, 검증되지 않은 대량 자동화라 판단했다.
 */
export function buildDesignPlanInputFromPlanning(
  inquiry: Pick<InquiryRecord, "companyName" | "contactName" | "siteType" | "requirements" | "industry" | "analysis">,
  planning: PlanningContent
): DesignPlanInput {
  const projectName = inquiry.companyName.trim() || inquiry.contactName.trim() || "New Project";
  const projectType = inquiry.analysis?.detectedBusinessType || inquiry.siteType || "website";

  const requirements = [
    inquiry.requirements,
    planning.specification.overview,
    planning.specification.pages.length > 0
      ? `추천 페이지: ${planning.specification.pages.map((page) => page.name).join(", ")}`
      : "",
    planning.specification.functions.length > 0
      ? `추천 기능: ${planning.specification.functions.map((fn) => fn.name).join(", ")}`
      : "",
  ]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");

  const targetUsers = inquiry.industry ? `${inquiry.industry} 관련 고객` : "일반 방문자";

  return { projectName, projectType, requirements, targetUsers };
}
