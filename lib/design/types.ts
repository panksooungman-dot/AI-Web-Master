/**
 * Design Automation — Phase 1 (docs/03_DESIGN/DESIGN_WORKFLOW.md의 Phase 2 "요구사항 분석" +
 * Phase 3 "기획"을 하나로 묶은 범위): Requirement Analysis, Feature List, Site Map, User Flow,
 * Screen List. Storyboard/Wireframe/Prototype/Claude Design/Figma/Design Sync는 이후 Phase.
 */

export interface DesignPlanInput {
  projectName: string;
  /** 자유 텍스트 — 예: "치과 웹사이트", "SaaS 대시보드" (Website Builder의 businessType과 동일한 취지). */
  projectType: string;
  /** 고객 요구사항 원문. */
  requirements: string;
  /** 대상 사용자 — 예: "지역 주민, 30~50대". */
  targetUsers: string;
  /** 기존 Project Manager(lib/projects/registry.ts)의 Project와 선택적으로 연결(강제 아님). */
  projectId?: string;
}

export interface RequirementAnalysis {
  projectSummary: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  businessRules: string[];
  targetUsers: string[];
}

export type FeaturePriority = "High" | "Medium" | "Low";

export interface FeatureItem {
  name: string;
  description: string;
  priority: FeaturePriority;
}

export interface SiteMapNode {
  path: string;
  title: string;
  children?: SiteMapNode[];
}

export interface UserFlowStep {
  step: number;
  screen: string;
  action: string;
  /** 다음 화면 이름, 또는 흐름의 끝이면 "Complete". */
  next: string;
}

export interface UserFlow {
  name: string;
  steps: UserFlowStep[];
}

export interface ScreenListItem {
  name: string;
  path: string;
  description: string;
  components: string[];
}

export interface DesignPlanContent {
  requirementAnalysis: RequirementAnalysis;
  featureList: FeatureItem[];
  siteMap: SiteMapNode[];
  userFlows: UserFlow[];
  screenList: ScreenListItem[];
}

export interface DesignPlanRecord {
  id: string;
  input: DesignPlanInput;
  content: DesignPlanContent;
  /** Provider 미설정/생성 실패 시 결정론적 기본값으로 생성되었는지 여부 (Website Builder Content Engine과 동일한 의미론). */
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}
