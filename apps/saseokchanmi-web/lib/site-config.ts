/**
 * 사색찬미한정식 공식 홈페이지 — 사이트 전역 설정.
 *
 * 기획서(사색찬미한정식 Claude Code 개발용 홈페이지 기획서 & 화면 스토리보드 v2)에서 확정된
 * 값만 사실로 채운다. 전화번호·영업시간·주차 조건·네이버 플레이스 URL·도메인 등 매장 확인이
 * 필요한 값은 임의로 추정하지 않고 `null`로 비워두며, 화면에서는 각각 TODO 배지로 노출한다.
 * 실제 정보가 확정되면 이 파일의 값만 채우면 사이트 전체에 반영된다.
 */

export const SITE_NAME = "사색찬미한정식";

export const SITE_TAGLINE = "파주 한정식 맛집, 사색찬미한정식";

export const SITE_DESCRIPTION =
  "경기 파주 광탄의 한정식 전문점 사색찬미한정식. 갓 지은 솥밥과 정갈한 한 상으로 가족모임, 상견례, 생신, 단체모임을 준비하세요.";

/** 배포 도메인 확정 전 임시값. 실제 도메인(saseokchanmi.com 등) 확정 후 교체 필요. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saseokchanmi.com";

export const ADDRESS = {
  full: "경기 파주시 광탄면 만장산로 363 1층",
  region: "경기 파주시 광탄면",
} as const;

/**
 * 매장 확인 전까지 비워둔다 — 임의로 추정하지 않는다.
 *
 * 2026-09-21 — 실제 매장주(의뢰자)가 네이버플레이스(사색찬미한정식, ID 1882539912) 캡처를
 * 직접 제공해 phone·lastOrder·parkingInfo·naverPlaceUrl을 확정했다. businessHours·
 * closedDays는 네이버플레이스 화면에 없어 남겨뒀다가, 매장주가 직접 "오픈 10시·휴무 없음"을
 * 확인해줘 확정했다.
 */
export const CONTACT = {
  phone: "031-945-8804",
  businessHours: "매일 10:00 ~ 19:30",
  lastOrder: "19:30",
  closedDays: "연중무휴",
  parkingInfo: "주차 가능(무료), 발렛 주차 가능(무료). 주차장이 넓어 대형버스 4대까지 주차할 수 있습니다.",
  // pcmap.place.naver.com/restaurant/<ID>/photo 경로가 캡처에 보여 ID(1882539912)를
  // 확인했다 — 대표 링크는 그 표준 홈 경로로 구성. 실제로 열리는지는 배포 전 재확인 필요.
  naverPlaceUrl: "https://pcmap.place.naver.com/restaurant/1882539912/home" as string | null,
  /**
   * 2026-09-22 — 매장주가 직접 제공한 네이버 예약(실시간 시간대 선택) 전용 링크.
   * naverPlaceUrl(플레이스 홈·길찾기·리뷰)과는 별개 페이지라, "예약하기" 버튼은
   * 이 링크로, "길찾기·리뷰" 버튼은 계속 naverPlaceUrl로 분리해서 연결한다.
   */
  naverBookingUrl: "https://booking.naver.com/booking/17/bizes/1743720" as string | null,
  /**
   * 2026-09-22 — 매장주가 보내준 네이버 스마트플레이스 리뷰 관리 화면 캡처에서 확인된
   * 실제 값("플레이스 평균 평점 ★ 4.20"). 개별 리뷰 작성자명·본문은 캡처 해상도가 낮아
   * (원본 폭 381px) 정확히 읽을 수 없어 지어내지 않고, 이 집계 수치만 사실로 채운다.
   * 평점이 바뀌면 이 값도 주기적으로 재확인해 갱신 필요.
   */
  naverAverageRating: 4.2 as number | null,
  /**
   * 네이버 스마트콜(네이버가 무료 제공하는 가상 전화번호 — 통화 연결·스마트 ARS·발신자
   * 검색정보 분석·통화/검색 통계를 지원) 연동 준비 자리. 이 서비스는 별도 API 연동이
   * 필요한 게 아니라, 네이버 스마트플레이스에서 스마트콜을 신청하면 발급되는 가상
   * 전화번호를 노출용으로 쓰는 방식이다. 아직 발급받지 않아 null — 발급되면 이 값을
   * 채우고, 화면에 노출할 위치(전화·라스트오더 안내 등)는 그때 확정한다. 이미 확정된
   * 실제 매장 전화번호(phone)는 임의로 대체하지 않는다.
   */
  smartCallNumber: null as string | null,
} as const;

/** 2026-09-21 — 네이버플레이스 캡처의 "SNS"·"결제수단" 항목에서 그대로 확인된 값. */
export const BLOG_URL = "https://blog.naver.com/4s_chanmihanjeongsik";

/** 온라인 결제 연동(네이버페이 등)이 아니라, 매장에서 실제로 받는 결제 수단 안내다. */
export const PAYMENT_METHODS = ["지역화폐 (모바일형)", "지역화폐 (카드형)", "제로페이", "간편결제"] as const;

export const NAV_ITEMS = [
  { href: "/about", label: "브랜드 이야기" },
  { href: "/menu", label: "메뉴" },
  { href: "/food", label: "음식·솥밥" },
  { href: "/occasion", label: "모임 안내" },
  { href: "/paju", label: "광탄·파주" },
  { href: "/review", label: "고객 후기" },
  { href: "/location", label: "오시는 길" },
] as const;

export const RESERVATION_HREF = "/reservation";

/** 기획서 8장 SEO 키워드 전략을 그대로 반영한 키워드 그룹. 메타데이터 keywords에 조합해 사용한다. */
export const SEO_KEYWORDS = {
  brand: ["사색찬미한정식", "사색찬미"],
  core: [
    "파주한정식",
    "파주한정식맛집",
    "파주한정식추천",
    "파주한식맛집",
    "파주한정식코스",
    "파주한정식코스요리",
    "파주고급한정식",
    "파주한정식예약",
  ],
  occasion: [
    "파주상견례",
    "파주상견례식당",
    "파주가족모임식당",
    "파주부모님식사",
    "파주생신모임",
    "파주룸식당",
    "파주개별룸식당",
    "파주단체식당",
    "파주주차편한맛집",
    "파주아이와가볼만한식당",
  ],
  gwangtan: [
    "광탄한정식",
    "광탄한정식맛집",
    "광탄맛집",
    "광탄한식맛집",
    "광탄가족모임",
    "광탄부모님식사",
    "광탄단체식당",
    "광탄점심맛집",
  ],
  nearby: [
    "운정",
    "야당",
    "금촌",
    "금릉",
    "교하",
    "심학산",
    "문산",
    "봉일천",
    "조리읍",
    "월롱",
    "헤이리",
    "탄현",
  ],
  tour: [
    "파주드라이브맛집",
    "파주여행맛집",
    "마장호수한정식",
    "마장호수근처맛집",
    "헤이리한정식",
    "헤이리맛집",
    "임진각한정식",
    "임진각근처맛집",
    "파주출판단지맛집",
    "파주데이트",
    "파주데이트코스",
  ],
  menu: [
    "파주솥밥맛집",
    "파주돌솥밥맛집",
    "파주불고기한정식",
    "파주반찬잘나오는집",
    "파주가성비한정식",
    "파주점심특선맛집",
  ],
} as const;

export function seoKeywords(...groups: (keyof typeof SEO_KEYWORDS)[]): string[] {
  return groups.flatMap((group) => [...SEO_KEYWORDS[group]]);
}

export const OG_DEFAULTS = {
  siteName: SITE_NAME,
  locale: "ko_KR",
  type: "website" as const,
};

/**
 * app/opengraph-image.tsx가 생성하는 이미지를 가리킨다. Next.js 파일 컨벤션은 페이지가
 * 자체 openGraph/twitter 필드를 선언하지 않을 때만 이 이미지를 자동으로 채워주므로,
 * 페이지별로 title·description을 다르게 지정하려면(=openGraph 객체를 직접 선언하려면)
 * 이 값도 함께 명시해야 이미지가 계속 노출된다.
 */
export const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630 };
