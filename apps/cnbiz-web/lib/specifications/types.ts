/**
 * 기능 명세서 자동 생성 — AI Analysis Engine(lib/ai-analysis)의 AIAnalysisResult를 입력으로
 * 사용하는 신규 독립 서비스. lib/estimates/types.ts와 완전히 동일한 원칙(별도 서비스, 신규
 * AiJobType 없음, AiJobType·AiJobStatus·processJob()·Customer Inquiry Pipeline은 전혀
 * 건드리지 않음)으로 구현한다.
 *
 * lib/estimates/types.ts와 동일하게 lib/inquiries를 import하지 않아 Inquiry Pipeline 밖에서도
 * 재사용 가능하다.
 */
export interface SpecPage {
  name: string;
  description: string;
}

export type SpecFeaturePriority = "High" | "Medium" | "Low";

export interface SpecFeature {
  name: string;
  description: string;
  priority: SpecFeaturePriority;
}

export interface SpecApiEndpoint {
  method: string;
  path: string;
  description: string;
}

/** AI(또는 결정론적 폴백)가 판단하는 부분. */
export interface SpecificationJudgment {
  overview: string;
  pages: SpecPage[];
  features: SpecFeature[];
  adminFeatures: string[];
  apis: SpecApiEndpoint[];
  dbOverview: string;
  scopeIncluded: string[];
  scopeExcluded: string[];
  techStack: string[];
  deliverables: string[];
}

export type SpecificationResult = SpecificationJudgment;

export interface SpecificationInput {
  companyName: string;
  detectedBusinessType: string;
  recommendedPages: string[];
  recommendedFunctions: string[];
  requirements: string;
}

export interface SpecificationRecord {
  id: string;
  inquiryId: string;
  websiteOrderId: string;
  input: SpecificationInput;
  result: SpecificationResult;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}
