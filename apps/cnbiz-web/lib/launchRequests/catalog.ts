/**
 * 정보 요청서(Launch Request) 서비스 카탈로그 — 개발 착수 후 의뢰자에게 계정 생성·API 키 발급을
 * 요청해야 하는 항목들의 고정 목록. AI가 프로젝트마다 새로 지어내지 않고, 관리자가
 * /developer/inquiries/[id]에서 이 중 실제로 필요한 항목만 체크박스로 선택해 문서를 구성한다
 * (AskUserQuestion에서 사용자가 선택한 "관리자가 직접 체크박스로 선택" 방식).
 *
 * 각 항목은 다음 기준으로만 포함했다 — 지어내지 않는다는 원칙(CLAUDE.md)에 따라:
 * - 이 저장소에 실제로 이미 연동되어 있는 서비스(Resend 이메일, Google Analytics) — 실제 사용 확인됨
 * - 대한민국 시장에서 널리 쓰이는 범용 서비스(도메인 등록, 토스페이먼츠, 카카오/네이버 소셜 로그인,
 *   동영상 스트리밍) — CNBIZ 고유 정책이 아닌 업계 일반 절차만 서술
 *
 * fields/setupSteps의 값은 화면에 안내 문구로만 표시되며, 의뢰자가 입력한 실제 키 값은 이 카탈로그가
 * 아니라 공개 페이지(app/launch-request/[id]/page.tsx)의 클라이언트 state에만 존재하고 서버에는
 * 전송·저장되지 않는다(AskUserQuestion에서 사용자가 선택한 "서버 저장 안 함" 방식).
 */

export interface LaunchRequestField {
  key: string;
  label: string;
  helpText: string;
}

export interface LaunchRequestCatalogItem {
  id: string;
  icon: string;
  name: string;
  summary: string;
  /** 관리자가 선택 시 기본으로 켜지는 필수/선택 여부 — 선택 후에도 관리자가 개별 조정 가능. */
  defaultRequired: boolean;
  costLabel: string;
  costDetail: string;
  fields: LaunchRequestField[];
  setupSteps: string[];
  notes?: string;
}

export const LAUNCH_REQUEST_CATALOG: LaunchRequestCatalogItem[] = [
  {
    id: "domain",
    icon: "🌐",
    name: "도메인",
    summary: "서비스 주소입니다. 의뢰자 명의로 직접 구매해야 합니다.",
    defaultRequired: true,
    costLabel: "연 1~3만원",
    costDetail: ".kr / .com 기준, 등록처마다 상이",
    fields: [
      { key: "domainName", label: "원하는 도메인", helpText: "예: example.kr, example.co.kr, example.com" },
      { key: "domainRegistrar", label: "도메인 등록처", helpText: "가비아, 후이즈, Cloudflare Registrar 중 선택" },
    ],
    setupSteps: [
      "가비아·후이즈·Cloudflare Registrar 등에서 원하는 도메인명 검색 후 구매",
      "구매 완료 후 개발팀에 도메인명을 전달하면 실제 서비스와 연결 작업을 진행합니다.",
    ],
  },
  {
    id: "payment",
    icon: "💳",
    name: "결제 서비스 연동",
    summary: "온라인 결제(카드·간편결제·계좌이체 등)를 처리하려면 결제대행사 가맹점 등록이 필요합니다.",
    defaultRequired: true,
    costLabel: "무료 (결제 수수료 별도)",
    costDetail: "결제금액의 2~3.3% 수준(가맹점 심사 결과에 따라 상이)",
    fields: [
      { key: "paymentClientKey", label: "클라이언트 키", helpText: "결제대행사 개발자센터 → 내 상점 → API 키 → 클라이언트 키" },
      { key: "paymentSecretKey", label: "시크릿 키", helpText: "동일 위치 → 시크릿 키 (절대 외부 공개 금지)" },
      { key: "paymentMerchantId", label: "상점 ID", helpText: "가맹점 등록 완료 후 발급되는 고유 ID" },
    ],
    setupSteps: [
      "토스페이먼츠 등 결제대행사 개발자센터에서 회원가입 후 신규 상점 등록",
      "사업자 등록증·통장사본·신분증 사본 등 심사 서류 제출",
      "심사 완료(통상 2~5 영업일) 후 정식 API 키 발급 — 심사 전에는 테스트 키로 개발 진행 가능",
    ],
    notes: "시크릿 키는 절대 타인에게 공개하지 마세요. 카카오톡 등 메신저보다 이메일 전송을 권장합니다.",
  },
  {
    id: "socialLogin",
    icon: "🔐",
    name: "소셜 로그인",
    summary: "카카오·네이버 계정으로 간편 로그인 기능을 추가합니다. 없어도 이메일/비밀번호 로그인으로 운영 가능합니다.",
    defaultRequired: false,
    costLabel: "무료",
    costDetail: "-",
    fields: [
      { key: "kakaoRestApiKey", label: "카카오 REST API 키", helpText: "Kakao Developers → 앱 만들기 → 앱 키 → REST API 키" },
      { key: "kakaoJsKey", label: "카카오 JavaScript 키", helpText: "동일 위치 → JavaScript 키" },
      { key: "naverClientId", label: "네이버 Client ID", helpText: "네이버 개발자센터 → 애플리케이션 등록 → Client ID" },
      { key: "naverClientSecret", label: "네이버 Client Secret", helpText: "동일 위치 → Client Secret" },
    ],
    setupSteps: [
      "필요한 서비스(카카오/네이버)의 개발자센터에서 앱 등록",
      "발급된 키를 아래 입력란에 입력 후 개발팀에 전달",
    ],
  },
  {
    id: "email",
    icon: "📧",
    name: "이메일 발송 서비스",
    summary: "회원가입 인증·알림 메일 등을 발송합니다. 자체 발신 도메인을 원하는 경우에만 필요합니다.",
    defaultRequired: false,
    costLabel: "무료 (월 소량 기준)",
    costDetail: "발송량에 따라 유료 전환 가능",
    fields: [
      { key: "emailApiKey", label: "API Key", helpText: "이메일 발송 서비스 가입 후 API Keys 메뉴에서 발급" },
      { key: "emailFromAddress", label: "발신 이메일 주소", helpText: "예: noreply@example.kr (도메인 구매 후 설정 가능)" },
    ],
    setupSteps: [
      "이메일 발송 서비스 가입",
      "발신 도메인 인증 후 API 키 발급",
    ],
  },
  {
    id: "analytics",
    icon: "📊",
    name: "웹 분석 (Google Analytics)",
    summary: "방문자·유입 경로 등 트래픽 데이터를 확인하려면 필요합니다.",
    defaultRequired: false,
    costLabel: "무료",
    costDetail: "-",
    fields: [
      { key: "gaMeasurementId", label: "측정 ID", helpText: "Google Analytics 관리 → 데이터 스트림에서 확인 (G-로 시작)" },
    ],
    setupSteps: [
      "analytics.google.com 에서 계정·속성 생성",
      "웹 데이터 스트림 생성 후 측정 ID(G-XXXXXXX) 확인, 개발팀에 전달",
    ],
  },
  {
    id: "mediaStreaming",
    icon: "🎬",
    name: "동영상/미디어 스트리밍",
    summary: "강의·홍보 영상을 다량으로 저장·재생해야 하는 경우에만 필요합니다.",
    defaultRequired: false,
    costLabel: "월 $5~ (사용량 기준)",
    costDetail: "저장 용량·재생 시간에 따라 종량 과금",
    fields: [
      { key: "streamAccountId", label: "Account ID", helpText: "스트리밍 서비스 대시보드에서 확인" },
      { key: "streamApiToken", label: "API Token", helpText: "스트리밍 서비스 개발자 설정에서 발급" },
    ],
    setupSteps: [
      "동영상 스트리밍 서비스(예: Cloudflare Stream) 가입 및 유료 플랜 활성화",
      "발급된 Account ID·API Token을 개발팀에 전달",
    ],
  },
];

export function getLaunchRequestCatalogItem(id: string): LaunchRequestCatalogItem | undefined {
  return LAUNCH_REQUEST_CATALOG.find((item) => item.id === id);
}
