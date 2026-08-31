import type { EstimateDocumentDetails, EstimateRecord, EstimateSupplierInfo } from "./types";

/**
 * result·createdAt로부터 견적서 문서 필드의 기본값을 계산한다 — estimate.document에 저장된
 * 값이 있으면 그 값이 우선한다. 관리자 화면(`/developer/estimates/[id]`)과 의뢰자 공개
 * 페이지(`/quote/[token]`) 양쪽에서 동일한 기본값 규칙을 쓰기 위해 순수 함수로 분리했다.
 */
export function buildDefaultEstimateDocument(estimate: EstimateRecord): Required<EstimateDocumentDetails> {
  const { input, result } = estimate;
  const saved = estimate.document ?? {};
  const supplier: EstimateSupplierInfo = saved.supplier ?? {};

  return {
    projectTitle: saved.projectTitle ?? `${input.companyName} 홈페이지 제작`,
    developmentPeriod: saved.developmentPeriod ?? `${Math.max(1, Math.round(result.timelineWeeks / 4))}개월`,
    validityPeriod: saved.validityPeriod ?? "30일",
    dueDate: saved.dueDate ?? "",
    maintenancePeriod: saved.maintenancePeriod ?? "6개월",
    finalAmount: saved.finalAmount ?? result.priceRangeMax,
    notes:
      saved.notes ??
      [
        "1. 상기 견적금액은 부가가치세가 포함된 금액입니다.",
        "2. 본 견적서는 제안요청서를 기준으로 작성되었습니다.",
        "3. 개발 범위 변경 시 금액이 조정될 수 있습니다.",
      ].join("\n"),
    paymentTerms:
      saved.paymentTerms ??
      ["계약금 30% : 계약 체결 시", "중도금 40% : 개발 완료 후", "잔금 30% : 최종 검수 완료 후"].join("\n"),
    supplier: {
      companyName: supplier.companyName ?? "씨엔비즈",
      businessNumber: supplier.businessNumber ?? "812-08-00355",
      ceoName: supplier.ceoName ?? "박성만",
      contactName: supplier.contactName ?? "PM 김은미",
      phone: supplier.phone ?? "010-5853-8013",
      address: supplier.address ?? "서울특별시 금천구 두산로70길 현대지식산업센터 A동 1210/1702호",
    },
  };
}
