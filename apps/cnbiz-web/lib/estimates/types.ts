/**
 * 기술 견적서 자동 생성 — AI Analysis Engine(lib/ai-analysis)의 AIAnalysisResult를 입력으로
 * 사용하는 신규 독립 서비스. PROJECT_STATUS.md가 명시한 확장 지점("AI Analysis Engine의
 * AIAnalysisResult를 입력으로 사용하는 새 AiJobType(또는 별도 서비스) 설계·구현")을
 * "별도 서비스"로 구현한다 — AiJobType·AiJobStatus·processJob()·Customer Inquiry Pipeline은
 * 전혀 건드리지 않는다.
 *
 * lib/ai-analysis/types.ts의 AIAnalysisInput과 동일한 원칙 — lib/inquiries를 import하지 않아
 * Inquiry Pipeline 밖에서도 재사용 가능하다.
 */
export interface EstimateLineItem {
  name: string;
  description: string;
  estimatedHours: number;
}

/** AI(또는 결정론적 폴백)가 판단하는 부분. */
export interface EstimateJudgment {
  lineItems: EstimateLineItem[];
  priceRangeMin: number;
  priceRangeMax: number;
  timelineWeeks: number;
  assumptions: string[];
  summary: string;
}

export interface EstimateResult extends EstimateJudgment {
  currency: "KRW";
}

export interface EstimateInput {
  companyName: string;
  detectedBusinessType: string;
  recommendedPages: string[];
  recommendedFunctions: string[];
  requirements: string;
  budget?: string;
}

export interface EstimateRecord {
  id: string;
  inquiryId: string;
  websiteOrderId: string;
  input: EstimateInput;
  result: EstimateResult;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}
