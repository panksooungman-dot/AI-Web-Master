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

/** 계약 당사자 한쪽(공급자 또는 의뢰자)의 정형 정보. 전부 선택값이며 관리자가 직접 입력한다. */
export interface ContractPartyInfo {
  companyName?: string;
  businessNumber?: string;
  ceoName?: string;
  contactName?: string;
  phone?: string;
  address?: string;
}

/**
 * 공급자(=CNBIZ 자신)는 계약서마다 새로 서명하지 않고 미리 스캔해둔 도장/서명 이미지 하나를
 * 계속 재사용하는 것이 실무 관행이라, 의뢰자 서명(ContractSignature, 매 계약서마다 실제로
 * 그려서 제출)과 달리 정적 이미지 URL 한 장만 갖는다.
 */
export interface ContractSupplierInfo extends ContractPartyInfo {
  /** 관리자가 `/developer/contracts/[id]`에서 업로드한 도장/서명 이미지 URL. */
  sealImageUrl?: string;
}

/**
 * 계약서 하단 "계약 당사자" 표시를 위한 편집 가능 필드 — Estimate의 EstimateDocumentDetails와
 * 동일한 원칙(AI가 생성하는 result와 분리된 오버레이, 없으면 페이지가 기본값으로 채움).
 */
export interface ContractDocumentDetails {
  supplier?: ContractSupplierInfo;
  client?: ContractPartyInfo;
}

/**
 * 의뢰자가 `/quote/[token]/contract`에서 캔버스에 직접 그려 제출하는 전자서명. 공인전자서명이
 * 아닌 이미지 기반 서명이라는 점을 관리자 화면에 명시한다(법적 효력에 대한 판단은 사용자 책임).
 */
export interface ContractSignature {
  /** `canvas.toDataURL("image/png")` 결과. */
  imageDataUrl: string;
  signerName: string;
  signedAt: string;
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
  document?: ContractDocumentDetails;
  clientSignature?: ContractSignature;
}
