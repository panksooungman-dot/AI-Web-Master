/**
 * 계약서 자동 생성 — lib/estimates·lib/specifications·lib/timeline과 완전히 동일한 원칙의 신규
 * 독립 서비스. 입력이 세 Domain의 결과(EstimateRecord·SpecificationRecord·TimelineRecord)를
 * 전부 필요로 하지만, 그 파일들은 한 줄도 import해서 수정하지 않고 각 registry의 조회 함수만
 * 읽기 전용으로 호출한다(lib/timeline/generator.ts가 lib/estimates·lib/specifications를
 * 건드리지 않는 것과 동일한 "읽기만, 쓰기는 자신의 registry에만" 원칙).
 */
export interface ContractAmount {
  amount: number;
  currency: string;
  vatIncluded: boolean;
}

/** AI(또는 결정론적 폴백)가 판단하는 부분. */
export interface ContractJudgment {
  title: string;
  overview: string;
  purpose: string;
  developmentScope: string[];
  excludedScope: string[];
  schedule: string;
  contractAmount: ContractAmount;
  paymentTerms: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  maintenance: string;
  changeRequestPolicy: string;
  terminationClause: string;
  intellectualProperty: string;
  confidentiality: string;
  specialTerms: string[];
}

export type ContractResult = ContractJudgment;

export interface ContractInput {
  companyName: string;
  detectedBusinessType: string;
  requirements: string;
  scopeIncluded: string[];
  scopeExcluded: string[];
  deliverables: string[];
  priceRangeMin: number;
  priceRangeMax: number;
  totalDurationWeeks: number;
  totalDurationDays: number;
  milestoneNames: string[];
}

export interface ContractRecord {
  id: string;
  inquiryId: string;
  websiteOrderId: string;
  estimateId: string;
  specificationId: string;
  timelineId: string;
  input: ContractInput;
  result: ContractResult;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}
