/**
 * 제안서 자동 생성 — lib/estimates·lib/specifications·lib/timeline·lib/contracts와 완전히 동일한
 * 원칙의 신규 독립 서비스. 입력이 네 Domain의 결과(EstimateRecord·SpecificationRecord·
 * TimelineRecord·ContractRecord)를 전부 필요로 하지만, 그 파일들은 한 줄도 import해서 수정하지
 * 않고 각 registry의 조회 함수만 읽기 전용으로 호출한다(lib/contracts/generator.ts가 세 Domain을
 * 건드리지 않는 것과 동일한 "읽기만, 쓰기는 자신의 registry에만" 원칙).
 */
export interface ProposalPage {
  name: string;
  description: string;
}

export interface ProposalFeature {
  name: string;
  description: string;
}

export interface ProposalCost {
  amount: number;
  currency: string;
  description: string;
}

/** AI(또는 결정론적 폴백)가 판단하는 부분. */
export interface ProposalJudgment {
  title: string;
  executiveSummary: string;
  overview: string;
  requirementsAnalysis: string;
  objectives: string[];
  solutionOverview: string;
  pages: ProposalPage[];
  features: ProposalFeature[];
  techStack: string[];
  schedule: string;
  cost: ProposalCost;
  developmentScope: string[];
  deliverables: string[];
  maintenancePlan: string;
  expectedBenefits: string[];
  companyIntroduction: string;
  contactInfo: string;
}

export type ProposalResult = ProposalJudgment;

export interface ProposalInput {
  companyName: string;
  detectedBusinessType: string;
  requirements: string;
  pageNames: string[];
  featureNames: string[];
  techStack: string[];
  scopeIncluded: string[];
  deliverables: string[];
  priceRangeMin: number;
  priceRangeMax: number;
  currency: string;
  totalDurationWeeks: number;
  totalDurationDays: number;
  milestoneNames: string[];
  contractAmount: number;
  maintenanceSummary: string;
}

export interface ProposalRecord {
  id: string;
  inquiryId: string;
  websiteOrderId: string;
  estimateId: string;
  specificationId: string;
  timelineId: string;
  contractId: string;
  input: ProposalInput;
  result: ProposalResult;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}
