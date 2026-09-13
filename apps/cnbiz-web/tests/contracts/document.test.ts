import { describe, expect, it } from "vitest";
import { buildDefaultContractDocument } from "../../lib/contracts/document";
import type { ContractInput, ContractRecord, ContractResult } from "../../lib/contracts/types";

const INPUT: ContractInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "예약 기능이 필요합니다.",
  scopeIncluded: ["예약 기능 구현"],
  scopeExcluded: ["결제 연동"],
  deliverables: ["배포된 웹사이트"],
  priceRangeMin: 1_000_000,
  priceRangeMax: 1_500_000,
  totalDurationWeeks: 4,
  totalDurationDays: 28,
  milestoneNames: ["요구사항 완료"],
};

const RESULT: ContractResult = {
  title: "브라이트 카페 홈페이지 제작 계약서",
  overview: "요약",
  purpose: "목적",
  developmentScope: ["예약 기능 구현"],
  excludedScope: ["결제 연동"],
  schedule: "4주 이내 완료",
  contractAmount: { amount: 1_250_000, currency: "KRW", vatIncluded: false },
  paymentTerms: ["계약금", "중도금", "잔금"],
  deliverables: ["배포된 웹사이트"],
  acceptanceCriteria: ["검수 기준"],
  maintenance: "30일 무상 하자보수",
  changeRequestPolicy: "별도 협의",
  terminationClause: "서면 통지로 해지",
  intellectualProperty: "잔금 완료 후 갑에게 귀속",
  confidentiality: "비밀유지 의무",
  specialTerms: [],
};

function makeContract(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: "contract-1",
    inquiryId: "inquiry-1",
    websiteOrderId: "order-1",
    estimateId: "estimate-1",
    specificationId: "specification-1",
    timelineId: "timeline-1",
    input: INPUT,
    result: RESULT,
    simulated: true,
    createdAt: "2026-09-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildDefaultContractDocument() — lib/contracts/document.ts", () => {
  it("falls back to CNBIZ supplier defaults and input.companyName for client when document is missing", () => {
    const doc = buildDefaultContractDocument(makeContract());

    expect(doc.supplier.companyName).toBe("씨엔비즈");
    expect(doc.supplier.businessNumber).toBe("812-08-00355");
    expect(doc.supplier.sealImageUrl).toBe("");
    expect(doc.client.companyName).toBe("브라이트 카페");
    expect(doc.client.contactName).toBe("");
  });

  it("prefers saved document values over defaults", () => {
    const doc = buildDefaultContractDocument(
      makeContract({
        document: {
          supplier: { companyName: "다른 이름", sealImageUrl: "https://example.com/seal.png" },
          client: { companyName: "저장된 고객사명", contactName: "홍길동" },
        },
      })
    );

    expect(doc.supplier.companyName).toBe("다른 이름");
    expect(doc.supplier.sealImageUrl).toBe("https://example.com/seal.png");
    // 저장된 값에 없는 필드는 여전히 기본값으로 채워진다.
    expect(doc.supplier.ceoName).toBe("박성만");
    expect(doc.client.companyName).toBe("저장된 고객사명");
    expect(doc.client.contactName).toBe("홍길동");
  });
});
