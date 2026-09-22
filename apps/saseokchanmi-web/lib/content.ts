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
   * 2026-09-22 — 매장주가 네이버 스마트플레이스 "대표 메뉴" 탭에 이어 "전체 메뉴" 탭의
   * 실제 HTML도 전달해줘, SIGNATURE_MENU·ADDITIONAL_MENU 9종 전부 실제 사진(320x320,
   * search.pstatic.net 프록시 — 리뷰 사진과 동일한 방식, next.config.ts에 이미 허용된
   * 도메인)으로 교체했다. 이전에 쓰던 70x70px 로컬 썸네일보다 훨씬 선명해, 리스트 썸네일을
   * 96px로 키워도(app/menu/page.tsx) 흐려지지 않는다.
   */
  image?: string;
  /** 아직 남은 확인사항이 있을 때만 채운다(예: 사진). 전부 확정되면 생략한다. */
  todo?: string;
}

/**
 * 대표 메뉴. 기획서 3장(SIGNATURE) 슬롯을 매장주(의뢰자)가 2026-09-21 네이버플레이스
 * 캡처로 직접 확인해준 실제 "대표" 표시 메뉴 6종으로 채웠다(3~5개로 잡았던 원래 슬롯 수보다
 * 많지만, 실제 매장이 6개를 전부 대표 메뉴로 지정해뒀으므로 임의로 줄이지 않았다).
 *
 * 2026-09-22 — 매장주가 네이버 스마트플레이스 "대표 메뉴" 탭의 실제 HTML을 전달해줘,
 * description·image를 그 원문 그대로 반영했다(항목 순서·이름·가격은 기존과 동일해 6종이
 * 정확히 일대일로 대응됨을 확인).
 */
export const SIGNATURE_MENU: MenuItem[] = [
  {
    name: "제육 조기 가자미 솥밥정식",
    price: "18,000원",
    description: "사색찬미 정식 : 제육볶음과 가자미, 조기 그리고 16가지 반찬(개인솥밥 제공)",
    image:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260827_244%2F1787805068595pWvPG_JPEG%2F8857.jpg",
  },
  {
    name: "제육코다리 조기가자미솥밥 정식",
    price: "22,000원",
    description: "매콤한 코다리조림에 단짝 제육볶음에 생선튀김에 12가지반찬이 제공됩니다(개인솥밥)",
    image:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260725_203%2F1784979363700LiyYM_JPEG%2F8809.jpg",
  },
  {
    name: "고등어 조기 가자미 솥밥정식",
    price: "20,000원",
    description: "생선모듬정식 : 고등어구이와 가자미,조기 그리고 16가지 반찬(개인솥밥 제공)",
    image:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260715_33%2F1784107799478fMDpy_JPEG%2F7308.jpg",
  },
  {
    name: "코다리+조기가자미솥밥정식",
    price: "18,000원",
    description: null,
    image:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260801_175%2F1785573921407JqSl8_JPEG%2F8748.jpg",
  },
  {
    name: "LA갈비 조기 가자미솥밥 정식",
    price: "25,000원",
    description: "LA갈비정식 : LA갈비와 가자미, 조기 그리고 16가지 반찬(개인솥밥 제공)",
    image:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260715_147%2F1784107849166rUSGf_JPEG%2F8390.jpg",
  },
  {
    name: "불고기 조기 가자미솥밥 정식",
    price: "22,000원",
    description: "불고기 정식 : 불고기와 가자미,조기 그리고 16가지 반찬(개인솥밥 제공)",
    image:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250723_280%2F1753255016117YtYXx_JPEG%2FKakaoTalk_20250721_214527514_05.jpg",
  },
];

/**
 * 대표(SIGNATURE) 배지가 없는 그 외 판매 메뉴. 매장주가 2026-09-21 네이버플레이스
 * 전체 메뉴판 캡처로 직접 확인해준 3종 — SIGNATURE_MENU 6종과 별개로 실제 판매 중인
 * 메뉴다(사용자 확인: "정보 제공 해준 메뉴는 15개인데" — 캡처 화면에 15줄이 보이는 건
 * "추천 메뉴 6" 구간과 "전체 메뉴" 구간이 같은 6종을 한 번 더 나열해서 생기는 네이버
 * 자체 UI 중복이고, 실제로 서로 다른 메뉴는 이 3종을 더한 9종이다).
 *
 * 2026-09-22 — 매장주가 네이버 스마트플레이스 "전체 메뉴" 탭의 실제 HTML을 전달해줘,
 * image를 실제 사진(320x320)으로 교체했다(name·price·description은 이미 확인된 값과
 * 동일해 무변경).
 */
export const ADDITIONAL_MENU: MenuItem[] = [
  {
    name: "갈치한마리구이 (주말에는 예약 필수)",
    price: "20,000원",
    description: "겉바싹 속촉촉",
    image:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260903_103%2F1788402354725Q5aKP_JPEG%2F8972.jpg",
  },
  {
    name: "아침식사 코다리조림",
    price: "15,000원",
    description: "달큰한 무하고 매콤한 코다리조합",
    image:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260715_230%2F1784117654188TFg3E_JPEG%2F8688.jpg",
  },
  {
    name: "아침식사 한돈김치찌개",
    price: "12,000원",
    description: "국내산 앞다리살로 만든 김치찌개",
    image:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20260715_49%2F1784117508578E9ApO_JPEG%2F7972.jpg",
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
    name: "벽초지계곡",
    description: "맑은 물이 흐르는 계곡으로, 여름철 물놀이하기 좋은 곳입니다.",
    travelTime: "도보 1분",
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

export interface CustomerReview {
  /** 네이버 플레이스에 표시되는 닉네임을 그대로 사용한다(이미 공개된 닉네임, 지어내지 않음). */
  author: string;
  /** 5점 만점 별점(네이버 원문 값 그대로 — 5 또는 4.5 등). */
  rating: number;
  /** 방문일(네이버 원문 표기, 예: "2026. 9. 12"). */
  visitDate: string;
  /** 후기 원문. 줄바꿈은 \n으로 표시하고, 문구 자체는 한 글자도 수정하지 않는다. */
  text: string;
  /** 후기에 첨부된 사진 중 대표 1장(네이버 CDN 원본 URL). 사진이 없는 후기는 생략. */
  photo?: string;
}

/**
 * 2026-09-22 — 매장주가 네이버 스마트플레이스 "리뷰 관리" 화면의 실제 HTML을 그대로
 * 전달해줘 확정한 실제 고객 후기. 닉네임·별점·방문일·후기 문구·사진은 전부 그 HTML에서
 * 그대로 옮겨 왔으며(지어낸 내용 없음), 문구는 원문 그대로 보존한다(맞춤법·띄어쓰기도
 * 수정하지 않음). 사진은 각 후기의 첫 번째 첨부 사진 1장만 대표로 사용한다.
 */
export const CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    author: "깍형",
    rating: 5,
    visitDate: "2026. 9. 12",
    text: "성묘갔다가 근처에 있는 한식당집을 찾았어요 1인18천원 코다리정식2인 가자미정식2인 시켜어요. 제육과 조기느 기분으로 인당나와요(헉~~코다리 사진이 빠졌네요~) 엄마아빠랑 남편이랑 먹으러갔는데 푸짐하게 건강하게 잘먹었어요~~ 넘 과하지도 않고 적정하면서도 맛있게 먹었고 사장님이 넘친절하세요~~",
    photo:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&src=https%3A%2F%2Fpup-review-phinf.pstatic.net%2FMjAyNjA5MTJfOTMg%2FMDAxNzg5MTg1NzQ5NDYy.SF8xclY77nK9V04HnSfqxyfGkJqQWuCuLTrtacqmmjEg.jJpSWdBkREgYNJ4hMOkOhe-wGOkavjtRmYcmZDHF6U8g.JPEG%2F20260912_110537.jpg.jpg&type=f352_440",
  },
  {
    author: "예쁜누",
    rating: 5,
    visitDate: "2026. 8. 4",
    text: "음식 다 나오고 흡입하느라 중간사진밖에 없네요 무지 친절하시고 음식 미친듯이 나와요 진짜 배터지게 먹었어요 예전에 이십만원 내고 간 한식당 보다 훨 나음\n사장님도 매우 친절하시고 음식 안아끼심 또 와볼만한 곳",
    photo:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&src=https%3A%2F%2Fpup-review-phinf.pstatic.net%2FMjAyNjA4MDRfMjAg%2FMDAxNzg1ODE2MDY0MzAw.7i5iYIUG5zHIJ3tQD3wZ1qOEdFpGfX4yE2NVjS7Q-AYg.sdzcpeENGfy3U4NoclT3MSshPgHh4Zc8HG9Yn9VC9Mgg.JPEG%2F1000041628.jpg.jpg&type=f440_440",
  },
  {
    author: "goii****",
    rating: 5,
    visitDate: "2026. 8. 29",
    text: "가족모임겸 찾아간곳인데 24명들어갈수있는 룸이있어서 조용하고 편안해서 오래앉아 이야기 나누며 식사하기 참좋았어요.어르신들 좋아하는 생선하고 청국장이 다들 맛있다고 식당 잘찾았다고 칭찬받았어요.식사 마치고 마실차도 줍니다.",
    photo:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&src=https%3A%2F%2Fpup-review-phinf.pstatic.net%2FMjAyNjA4MjlfMTgy%2FMDAxNzg4MDAwMDQwMTcw.UyuOgO5_DvmdxOvoJt9w5B_y69cjHWYW2Ohke9StzOcg.pHnpligpIyW2wNQyAzbiugHy27JXr4q3WBsss7jQAsgg.JPEG%2F20260828_124629.jpg.jpg&type=f352_440",
  },
  {
    author: "ey2ey2",
    rating: 5,
    visitDate: "2026. 9. 6",
    text: "사색찬미한정식에서 든든하게 식사하고 왔어요. \n생선구이부터 솥밥, 다양한 밑반찬까지 한 상 가득 차려져 엄청 푸짐했어요!!\n특히 따끈한 솥밥이 찰지고 고소해서 반찬들과 잘 어울렸어요. 반찬들도 종류가 다양하고 전체적으로 깔끔해서 가족들과 식사하기 좋았어요. 파주에서 정갈하고 푸짐한 한정식 찾으시는 분들께 추천하고 싶어요😊 \n정말 맛있게 먹었습니다! \n또 방문할께요 ^-^!!!",
    photo:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&src=https%3A%2F%2Fpup-review-phinf.pstatic.net%2FMjAyNjA5MDZfMTgy%2FMDAxNzg4Njk0NzAzODY5.YgLWX7osDbycwHwHhEO_gwAJ-5eqOOu5JALFEHxRdKIg.xqVAO7VajcvG3OJj0WgWZAuluYFc0cpPULOwl_4DvTEg.JPEG%2FC34F6076-1544-4277-854C-4F0E231AAA80.jpeg&type=f352_440",
  },
  {
    author: "나사랑93",
    rating: 5,
    visitDate: "2026. 7. 10",
    text: "벽초지수목원 나들이 나왔다 \n전에 먹고 좋았던 추억 찾아 재방문합니다.\n갈비정식 고등어정식 너무 맛있어요\n밑반찬도 풍성하고 개인밥솥이라 너무 좋앙~\n우리가족 오늘도 잘 먹고 갑니다~ 다음에 또 근처 들릴 일 있으면 찾아뵙게요~~",
    photo:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&src=https%3A%2F%2Fpup-review-phinf.pstatic.net%2FMjAyNjA3MTFfNzMg%2FMDAxNzgzNzY1OTU1MTI0.THSC5GU_kKdnPPTsHIiwnb-Q89glmiFX7-FX-WkYLSgg.PtKg_eIwK3UW23kXI6GlnzP0bqE8WEpkYWT9Rmx_kgUg.JPEG%2Fmmexport1783764545355.jpg.jpg&type=f660_440",
  },
  {
    author: "콜드브루조아",
    rating: 4.5,
    visitDate: "2026. 6. 18",
    text: "인근에 올 일이 있어 검색해서 방문했습니다 \n반찬도 모두 맛있고 솥밥이 너무 맛있었어요 무엇보다 제육볶음 짱맛입니다~!!! 그리고 서빙하시는 직원분 너무너무 친절하세요  👍  기분좋게 식사하고 갑니다 \n정신없이 먹다 찍은 사진 죄송요ㅎㅎ",
    photo:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&src=https%3A%2F%2Fpup-review-phinf.pstatic.net%2FMjAyNjA2MThfNTUg%2FMDAxNzgxNzcyMjA3Nzg3.DGQBln_SpTc50owb1QXQQYwkdwxentR_2gUZ_IrTNKYg.fcqfmOdp7eTgsdbWm3vuhICanBxw9Kx4P7TqSPKyIrEg.JPEG%2F1000082459.heic.jpg&type=f352_440",
  },
];

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
