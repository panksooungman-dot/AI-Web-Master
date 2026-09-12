/**
 * 사색찬미한정식 콘텐츠 데이터.
 *
 * 기획서에 실제로 명시된 카피(브랜드 소개, 방문 목적, 지역/여행 콘텐츠)는 그대로 사실로
 * 채우고, 매장만 확인 가능한 값(대표 메뉴명·가격·후기·사진)은 지어내지 않고 `null` +
 * `todo` 문구로 남긴다. 관리자가 실제 값을 확인하면 이 파일만 채우면 전 페이지에 반영된다.
 */

export interface MenuItem {
  /** 확정 전에는 null — 메뉴명을 지어내지 않는다. */
  name: string | null;
  /** 확정 전에는 null — 가격을 지어내지 않는다. */
  price: string | null;
  description: string | null;
  todo: string;
}

/** 대표 메뉴 3~5개 슬롯. 기획서 3장(SIGNATURE) 기준 — 매장 확인 후 이름·가격·사진을 채운다. */
export const SIGNATURE_MENU: MenuItem[] = [
  { name: null, price: null, description: null, todo: "대표 메뉴 1 — 메뉴명·가격·사진 확인 필요" },
  { name: null, price: null, description: null, todo: "대표 메뉴 2 — 메뉴명·가격·사진 확인 필요" },
  { name: null, price: null, description: null, todo: "대표 메뉴 3 — 메뉴명·가격·사진 확인 필요" },
];

export interface OccasionItem {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
}

/** 기획서 07 OCCASION 섹션 + 8-3 방문 목적 키워드. */
export const OCCASIONS: OccasionItem[] = [
  {
    slug: "family",
    title: "가족모임",
    description: "온 가족이 둘러앉아 정갈한 한 상을 나누는 자리에 어울리는 공간과 메뉴를 준비합니다.",
    keywords: ["파주가족모임식당"],
  },
  {
    slug: "parents",
    title: "부모님 식사",
    description: "부모님과 함께하는 조용하고 편안한 식사 자리를 위한 메뉴와 좌석을 안내합니다.",
    keywords: ["파주부모님식사"],
  },
  {
    slug: "anniversary",
    title: "생신·기념일",
    description: "생신이나 기념일처럼 특별한 날, 정성이 담긴 한 상으로 자리를 빛냅니다.",
    keywords: ["파주생신모임"],
  },
  {
    slug: "matchmaking",
    title: "상견례",
    description: "격식 있는 자리인 상견례에 맞는 정갈한 구성과 차분한 분위기를 제공합니다.",
    keywords: ["파주상견례", "파주상견례식당"],
  },
  {
    slug: "group",
    title: "단체식사",
    description: "회사 모임이나 단체 방문에 맞춰 인원과 일정에 맞는 상차림을 상담합니다.",
    keywords: ["파주단체식당"],
  },
];

export interface TourSpot {
  name: string;
  description: string;
  todo?: string;
}

/**
 * 기획서 09 TOUR 섹션 — 실제 존재하는 파주 지역 명소만 사용한다(기획서에서 허용한 항목).
 * 매장과의 실제 이동 거리·소요 시간은 확인 전까지 과장하지 않고 TODO로 남긴다.
 */
export const TOUR_SPOTS: TourSpot[] = [
  {
    name: "마장호수",
    description: "출렁다리로 잘 알려진 파주의 대표 나들이 명소입니다.",
    todo: "매장 기준 실제 이동 거리·소요 시간 확인 필요",
  },
  {
    name: "헤이리마을",
    description: "예술과 건축이 어우러진 파주의 문화예술마을입니다.",
    todo: "매장 기준 실제 이동 거리·소요 시간 확인 필요",
  },
  {
    name: "임진각",
    description: "역사와 평화의 의미를 담은 파주의 대표 관광지입니다.",
    todo: "매장 기준 실제 이동 거리·소요 시간 확인 필요",
  },
  {
    name: "파주출판단지",
    description: "책과 관련된 다양한 공간이 모여 있는 문화 지구입니다.",
    todo: "매장 기준 실제 이동 거리·소요 시간 확인 필요",
  },
];

/** 기획서 08 LOCAL 섹션 — 실제 접근성 확인 시 활용할 인근 지역명(8-5). */
export const NEARBY_AREAS = [
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
  "탄현",
] as const;

export interface ReviewItem {
  author: string;
  visitPurpose: string;
  body: string;
}

/**
 * 실제 고객 후기는 아직 수집·확인되지 않았다(기획서 10장: "실제 고객 후기 중심",
 * "후기 원문 사용 시 출처와 사용 범위를 확인"). 확인되지 않은 후기를 지어내는 대신
 * 빈 배열로 두고, 화면에서는 준비중 안내 + 네이버 플레이스 링크로 대체한다.
 */
export const REVIEWS: ReviewItem[] = [];

export interface SpacePhoto {
  label: string;
  category: "외관" | "홀" | "좌석" | "모임 공간" | "주차";
}

/** 실제 사진 수령 전까지 라벨만 있는 자리표시자. */
export const SPACE_PHOTOS: SpacePhoto[] = [
  { label: "외관", category: "외관" },
  { label: "홀 전경", category: "홀" },
  { label: "좌석", category: "좌석" },
  { label: "모임 공간", category: "모임 공간" },
  { label: "주차 공간", category: "주차" },
];
