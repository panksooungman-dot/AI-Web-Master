/**
 * 정보 요청서(Launch Request) — 개발 착수 후 의뢰자에게 계정·API 키 정보를 요청하는 문서.
 * lib/estimates·lib/specifications 등과 달리 AI 생성이 아니라 관리자가 카탈로그(catalog.ts)에서
 * 실제 필요한 서비스만 체크박스로 선택해 만드는 순수 메타데이터 레코드다 — 의뢰자가 입력하는 실제
 * API 키 값은 이 레코드에 포함되지 않는다(서버에 저장하지 않기로 결정, app/launch-request/[id] 참고).
 */

export interface LaunchRequestServiceSelection {
  serviceId: string;
  /** catalog의 defaultRequired를 기본값으로 쓰되, 관리자가 프로젝트 상황에 맞게 개별 조정 가능. */
  required: boolean;
}

/**
 * catalog.ts에 없는 프로젝트 고유 요청 항목. 2026-09-12 — "카탈로그에 없는 내용도 추가로 요청할
 * 수 있어야 한다"는 실사용 요청으로 추가. catalog 항목과 달리 fields/setupSteps 같은 구조화된
 * 안내는 없다 — 이름·설명만 관리자가 직접 입력하고, 공개 페이지에서는 범용 입력란 하나로
 * 응답을 받는다. 반복적으로 필요해지는 항목은 catalog.ts에 정식 항목으로 승격하는 것을 권장한다.
 */
export interface LaunchRequestCustomItem {
  name: string;
  description: string;
}

export interface LaunchRequestRecord {
  id: string;
  inquiryId: string;
  /** 생성 시점의 회사명 스냅샷 — 다른 문서 레코드(EstimateRecord.input.companyName 등)와 동일한 패턴. */
  companyName: string;
  services: LaunchRequestServiceSelection[];
  /** catalog에 없는 프로젝트 고유 요청 항목(선택). 없으면 빈 배열/undefined. */
  customItems?: LaunchRequestCustomItem[];
  createdAt: string;
}
