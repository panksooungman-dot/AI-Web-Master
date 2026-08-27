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

/**
 * 견적서를 정식 문서(귀중/제안금액/공급자 정보가 있는 견적서 양식)로 표시하기 위한 편집 가능
 * 필드 — 전부 선택값이며, 없으면 페이지에서 result 기반 기본값으로 채운다. 공급자 정보는
 * 실제 사업자 정보를 지어내지 않기 위해 빈 값을 기본으로 하고 관리자가 직접 입력·저장한다.
 */
export interface EstimateSupplierInfo {
  companyName?: string;
  businessNumber?: string;
  ceoName?: string;
  contactName?: string;
  phone?: string;
  address?: string;
}

export interface EstimateDocumentDetails {
  /** 건명 */
  projectTitle?: string;
  /** 개발기간(자유 텍스트, 예: "3개월") */
  developmentPeriod?: string;
  /** 유효기간(자유 텍스트, 기본 "30일") */
  validityPeriod?: string;
  /** 납기일(자유 텍스트 날짜) */
  dueDate?: string;
  /** 유지보수기간(자유 텍스트, 기본 "6개월") */
  maintenancePeriod?: string;
  /** 제안금액 — 없으면 result.priceRangeMax를 기본값으로 사용 */
  finalAmount?: number;
  /** 참고사항(줄바꿈으로 구분되는 자유 텍스트) */
  notes?: string;
  /** 대금지불방법(줄바꿈으로 구분되는 자유 텍스트) */
  paymentTerms?: string;
  supplier?: EstimateSupplierInfo;
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
  document?: EstimateDocumentDetails;
}
