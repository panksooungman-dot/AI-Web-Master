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
  /**
   * 2026-09-21 — 매장주가 네이버플레이스 메뉴판 캡처에서 잘라 제공한 70x70px 안팎의
   * 작은 썸네일. 카드처럼 크게 띄우면 흐릿해 보여 한 차례 제거했으나, 메뉴판 형식(작은
   * 썸네일 + 텍스트 목록)으로 표시할 때는 원본 크기 그대로 보여줘 문제가 없어 복원했다.
   * 고화질 원본(매장 직접 촬영 등)이 생기면 이 필드에 경로를 교체하면 된다.
   */
  image?: string;
  /** 아직 남은 확인사항이 있을 때만 채운다(예: 사진). 전부 확정되면 생략한다. */
  todo?: string;
}

/**
 * 대표 메뉴. 기획서 3장(SIGNATURE) 슬롯을 매장주(의뢰자)가 2026-09-21 네이버플레이스
 * 캡처로 직접 확인해준 실제 "대표" 표시 메뉴 6종으로 채웠다(3~5개로 잡았던 원래 슬롯 수보다
 * 많지만, 실제 매장이 6개를 전부 대표 메뉴로 지정해뒀으므로 임의로 줄이지 않았다).
 */
export const SIGNATURE_MENU: MenuItem[] = [
  {
    name: "제육 조기 가자미 솥밥정식",
    price: "18,000원",
    description: "제육볶음과 가자미·조기, 그리고 16가지 반찬(개인솥밥 제공)",
    image: "/images/menu/jeyuk-jogi-gajami.jpg",
  },
  {
    name: "제육코다리 조기가자미솥밥 정식",
    price: "22,000원",
    description: "매콤한 코다리조림에 제육볶음과 생선튀김, 12가지 반찬 제공",
    image: "/images/menu/jeyuk-kodari.jpg",
  },
  {
    name: "고등어 조기 가자미 솥밥정식",
    price: "20,000원",
    description: "고등어구이와 가자미·조기, 그리고 16가지 반찬(개인솥밥 제공)",
    image: "/images/menu/godeungeo.jpg",
  },
  {
    name: "코다리+조기가자미솥밥정식",
    price: "18,000원",
    description: null,
    image: "/images/menu/kodari-jogi.jpg",
  },
  {
    name: "LA갈비 조기 가자미솥밥 정식",
    price: "25,000원",
    description: "LA갈비와 가자미·조기, 그리고 16가지 반찬(개인솥밥 제공)",
    image: "/images/menu/la-galbi.jpg",
  },
  {
    name: "불고기 조기 가자미솥밥 정식",
    price: "22,000원",
    description: "불고기와 가자미·조기, 그리고 16가지 반찬(개인솥밥 제공)",
    image: "/images/menu/bulgogi.jpg",
  },
];

/**
 * 대표(SIGNATURE) 배지가 없는 그 외 판매 메뉴. 매장주가 2026-09-21 네이버플레이스
 * 전체 메뉴판 캡처로 직접 확인해준 3종 — SIGNATURE_MENU 6종과 별개로 실제 판매 중인
 * 메뉴다(사용자 확인: "정보 제공 해준 메뉴는 15개인데" — 캡처 화면에 15줄이 보이는 건
 * "추천 메뉴 6" 구간과 "전체 메뉴" 구간이 같은 6종을 한 번 더 나열해서 생기는 네이버
 * 자체 UI 중복이고, 실제로 서로 다른 메뉴는 이 3종을 더한 9종이다).
 */
export const ADDITIONAL_MENU: MenuItem[] = [
  {
    name: "갈치한마리구이 (주말에는 예약 필수)",
    price: "20,000원",
    description: "겉바싹 속촉촉",
    image: "/images/menu/galchi-hanmari.jpg",
  },
  {
    name: "아침식사 코다리조림",
    price: "15,000원",
    description: "달큰한 무하고 매콤한 코다리조합",
    image: "/images/menu/achim-kodari-jorim.jpg",
  },
  {
    name: "아침식사 한돈김치찌개",
    price: "12,000원",
    description: "국내산 앞다리살로 만든 김치찌개",
    image: "/images/menu/achim-kimchi-jjigae.jpg",
  },
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
  {
    slug: "date",
    title: "데이트",
    description:
      "마장호수·헤이리마을·임진각처럼 파주를 대표하는 나들이 코스 다음 일정으로, 정갈한 한 상과 함께 하루를 마무리하는 데이트 코스로도 좋습니다.",
    keywords: ["파주데이트", "파주데이트코스"],
  },
];

export interface TourSpot {
  name: string;
  description: string;
  /** 매장 기준 실제 이동 거리·소요 시간 확인 후 채운다(예: "도보 15분", "차량 20분"). */
  travelTime?: string;
  todo?: string;
}

/**
 * 기획서 09 TOUR 섹션 — 실제 존재하는 파주 지역 명소만 사용한다(기획서에서 허용한 항목).
 * 매장 기준 이동 거리·소요 시간은 2026-09-21 매장주가 직접 확인해준 실제 값이다.
 */
export const TOUR_SPOTS: TourSpot[] = [
  {
    name: "마장호수",
    description: "출렁다리로 잘 알려진 파주의 대표 나들이 명소입니다.",
    travelTime: "도보 15분",
  },
  {
    name: "헤이리마을",
    description: "예술과 건축이 어우러진 파주의 문화예술마을입니다.",
    travelTime: "차량 20분",
  },
  {
    name: "벽초지수목원",
    description: "한국의 전통 정원과 사계절 풍경으로 유명한 수목원입니다.",
    travelTime: "차량 2분",
  },
  {
    name: "임진각",
    description: "역사와 평화의 의미를 담은 파주의 대표 관광지입니다.",
    travelTime: "차량 15분",
  },
  {
    name: "파주출판단지",
    description: "책과 관련된 다양한 공간이 모여 있는 문화 지구입니다.",
    travelTime: "차량 10분",
  },
];

/**
 * TOUR_SPOTS(전부 실존이 확인된 파주 명소)를 데이트 코스로 자연스럽게 엮는 문구.
 * 새로운 장소·거리·소요 시간을 지어내지 않고, 이미 확정된 명소 이름만 그대로 인용한다.
 */
export const TOUR_DATE_COURSE_INTRO =
  "마장호수의 출렁다리, 헤이리마을의 갤러리, 임진각의 평화누리공원처럼 파주를 대표하는 나들이 코스에 사색찬미의 정갈한 한 상을 더하면 자연스러운 데이트 코스가 완성됩니다.";

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

export interface SeatingOption {
  label: string;
  capacity: string;
}

/**
 * 2026-09-21 — 네이버플레이스 "좌석·공간" 정보를 매장주(의뢰자)가 직접 캡처로 확인해준 실제
 * 값. 개별룸 보유 여부가 미확인 상태였던 기존 TODO를 해소한다(공간을 실사진으로 보여주는
 * SPACE_PHOTOS와 달리, 이건 인원수 같은 텍스트 정보라 별도 목록으로 둔다).
 */
export const SEATING_OPTIONS: SeatingOption[] = [
  { label: "단체석 (좌식)", capacity: "최소 2명 ~ 최대 130명" },
  { label: "프라이빗 룸", capacity: "최소 2명 ~ 최대 32명" },
];

export interface SpacePhoto {
  label: string;
  category: "외관" | "홀" | "좌석" | "모임 공간" | "주차";
  /** 실제 매장 사진 경로. 아직 없으면 PhotoPlaceholder로 대체된다. */
  image?: string;
  /** 사진 아래 표시하는 한 줄 카피. */
  caption?: string;
}

/** 2026-09-21 — 매장주가 제공한 실제 매장 사진 5장 반영. */
export const SPACE_PHOTOS: SpacePhoto[] = [
  {
    label: "외관",
    category: "외관",
    image: "/images/space/exterior.jpg",
    caption: "정갈한 간판 아래, 사색찬미의 첫인사",
  },
  {
    label: "홀 전경",
    category: "홀",
    image: "/images/space/hall.jpg",
    caption: "넉넉한 공간에서 나누는 넉넉한 한 상",
  },
  {
    label: "좌석",
    category: "좌석",
    image: "/images/space/seating.jpg",
    caption: "결 고운 원목 테이블, 마주 앉는 시간",
  },
  {
    label: "모임 공간",
    category: "모임 공간",
    image: "/images/space/gathering.jpg",
    caption: "평상에 둘러앉아 이어가는 정겨운 이야기",
  },
  {
    label: "주차 공간",
    category: "주차",
    image: "/images/space/parking.jpg",
    caption: "여유롭게 세우고 편안하게 드시는 하루",
  },
];
