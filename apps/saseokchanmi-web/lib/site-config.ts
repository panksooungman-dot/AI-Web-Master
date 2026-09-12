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

/** 매장 확인 전까지 비워둔다 — 임의로 추정하지 않는다. */
export const CONTACT = {
  phone: null as string | null,
  businessHours: null as string | null,
  lastOrder: null as string | null,
  closedDays: null as string | null,
  parkingInfo: null as string | null,
  naverPlaceUrl: null as string | null,
} as const;

export const NAV_ITEMS = [
  { href: "/about", label: "브랜드 이야기" },
  { href: "/menu", label: "메뉴" },
  { href: "/food", label: "음식·솥밥" },
  { href: "/space", label: "매장·주차" },
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
