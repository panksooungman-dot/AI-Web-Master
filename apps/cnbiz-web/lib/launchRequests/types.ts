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

export interface LaunchRequestRecord {
  id: string;
  inquiryId: string;
  /** 생성 시점의 회사명 스냅샷 — 다른 문서 레코드(EstimateRecord.input.companyName 등)와 동일한 패턴. */
  companyName: string;
  services: LaunchRequestServiceSelection[];
  createdAt: string;
}
