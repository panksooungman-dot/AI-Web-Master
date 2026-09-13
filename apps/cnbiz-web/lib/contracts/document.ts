import type { ContractDocumentDetails, ContractPartyInfo, ContractRecord, ContractSupplierInfo } from "./types";

/**
 * result·input으로부터 계약 당사자(공급자·의뢰자) 표시 필드의 기본값을 계산한다 —
 * contract.document에 저장된 값이 있으면 그 값이 우선한다. 관리자 화면
 * (`/developer/contracts/[id]`)과 의뢰자 공개 페이지(`/quote/[token]/contract`) 양쪽에서
 * 동일한 기본값 규칙을 쓰기 위해 순수 함수로 분리했다(lib/estimates/document.ts와 동일한 원칙).
 * 공급자 기본값은 lib/estimates/document.ts의 buildDefaultEstimateDocument()가 쓰는 것과
 * 동일한 실제 CNBIZ 정보를 재사용한다 — 같은 회사이므로 견적서·계약서가 서로 다른 공급자
 * 정보를 보여줄 이유가 없다.
 */
export function buildDefaultContractDocument(contract: ContractRecord): Required<ContractDocumentDetails> {
  const saved = contract.document ?? {};
  const supplier: ContractSupplierInfo = saved.supplier ?? {};
  const client: ContractPartyInfo = saved.client ?? {};

  return {
    supplier: {
      companyName: supplier.companyName ?? "씨엔비즈",
      businessNumber: supplier.businessNumber ?? "812-08-00355",
      ceoName: supplier.ceoName ?? "박성만",
      contactName: supplier.contactName ?? "PM 김은미",
      phone: supplier.phone ?? "010-5853-8013",
      address: supplier.address ?? "서울특별시 금천구 두산로70길 현대지식산업센터 A동 1210/1702호",
      sealImageUrl: supplier.sealImageUrl ?? "",
    },
    client: {
      companyName: client.companyName ?? contract.input.companyName,
      businessNumber: client.businessNumber ?? "",
      ceoName: client.ceoName ?? "",
      contactName: client.contactName ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
    },
  };
}
