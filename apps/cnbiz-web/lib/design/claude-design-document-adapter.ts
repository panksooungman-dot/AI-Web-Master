import type {
  Component,
  ComponentType as DesignComponentType,
  DesignDocument,
  Page,
  Section,
  SectionType,
  Theme,
} from "@cnbiz/design-system/types/design";
import { colors, radius, typography } from "@cnbiz/design-system";
import { DESIGN_DOCUMENT_VERSION, slugifyPath } from "./design-document-adapter";
import type { ComponentType as WireframeComponentType } from "./wireframe";
import type { PrototypeContent, PrototypeRecord } from "./prototype";

/**
 * Design JSON Standardization — Phase 6 (docs/architecture/DESIGN_JSON_SPEC.md).
 * Claude Design Generator(claude-design-generator.ts)의 입력을 Phase 4 전용 타입
 * (PrototypeRecord) 대신 표준 DesignDocument 기준으로 재구성하는 Adapter(Phase 3~5의
 * storyboard/wireframe/prototype-document-adapter.ts와 동일한 패턴).
 *
 * 지금까지의 Phase(3~5)는 `pages[].sections`를 항상 빈 배열로 남기는 Transitional Bridge였다.
 * 이번 Phase부터는 Prototype이 이미 가진 화면별 컴포넌트 구성(interactionMap의 element 목록)을
 * 이용해 실제로 Section/Component를 채워 넣기 시작한다 — 단, 이 매핑은 전부 이 Adapter 내부에서만
 * 수행되고 Generator는 이미 완성된 DesignDocument만 사용한다.
 *
 * ⚠️ 알려진 한계(정직하게 문서화):
 * 1) Wireframe/Prototype의 컴포넌트 팔레트(Header/Navigation/Sidebar/Hero/Card/Form/Table/
 *    Dashboard/Footer/Modal/Button/Search/Pagination, 13종 — 레이아웃 랜드마크 단위)와 표준
 *    DesignDocument의 ComponentType(heading/text/button/image/icon/card/form/input/textarea/
 *    checkbox/radio/select/video/map/divider/container/grid, 18종 — UI 원자 단위)은 서로 다른
 *    분류 체계다. 완벽한 1:1 대응은 존재하지 않으므로 아래 WIREFRAME_TO_DESIGN_COMPONENT는
 *    "가장 가까운 대응"을 고정 매핑한 결정론적 근사치다. 원래 타입은 Component.props.sourceType에
 *    그대로 보존해 정보 손실을 줄인다.
 * 2) Prototype은 Wireframe이 만들었던 화면 내부의 섹션 경계(예: "Header" 섹션 / "Main Content"
 *    섹션 / "Footer" 섹션 구분)를 보존하지 않는다 — Prototype의 interactionMap은 화면당 컴포넌트
 *    "목록"만 가지고 있다. 그 결과 이 Adapter는 화면(Page)당 Section을 정확히 1개만 생성하고 그
 *    안에 화면의 모든 컴포넌트를 담는다("채우기 시작"하는 첫 단계 — 완전한 섹션 분할은 Wireframe의
 *    섹션 경계를 Prototype까지 함께 전달해야 가능하며, 이번 Phase 범위 밖이다).
 * 3) SectionType(hero/about/services/portfolio/gallery/pricing/faq/testimonial/contact/footer)은
 *    마케팅 사이트의 "콘텐츠 목적" 분류라 Prototype에는 대응하는 정보가 없다. 화면의 title/path
 *    텍스트에 대한 키워드 매칭으로 추정하고, 매칭되지 않으면 첫 화면은 "hero", 나머지는 "about"으로
 *    폴백한다(완전한 분류가 아닌 최선의 추정치).
 *
 * 이 Adapter가 만드는 DesignDocument는 이번 Phase에서 어디에도 저장·노출되지 않는다(Registry·API
 * Route 변경 금지 원칙) — Generator 내부에서만 소비되는 순간적인(ephemeral) 표준 입력이다.
 */

const WIREFRAME_TO_DESIGN_COMPONENT: Record<WireframeComponentType, DesignComponentType> = {
  Header: "container",
  Navigation: "container",
  Sidebar: "container",
  Hero: "container",
  Card: "card",
  Form: "form",
  Table: "grid",
  Dashboard: "grid",
  Footer: "container",
  Modal: "container",
  Button: "button",
  Search: "input",
  Pagination: "button",
};

const SECTION_TYPE_KEYWORDS: Array<{ type: SectionType; keywords: string[] }> = [
  { type: "about", keywords: ["about", "회사", "소개"] },
  { type: "services", keywords: ["service", "서비스"] },
  { type: "portfolio", keywords: ["portfolio", "포트폴리오"] },
  { type: "gallery", keywords: ["gallery", "갤러리"] },
  { type: "pricing", keywords: ["pricing", "price", "요금", "가격"] },
  { type: "faq", keywords: ["faq", "자주"] },
  { type: "testimonial", keywords: ["testimonial", "review", "후기", "리뷰"] },
  { type: "contact", keywords: ["contact", "문의"] },
  { type: "footer", keywords: ["footer"] },
];

/** 페이지 title/path 텍스트로 SectionType을 추정한다(최선의 추정치, 알려진 한계 3번 참고). */
function inferSectionType(page: { title: string; path: string }, isFirstPage: boolean): SectionType {
  const haystack = `${page.title} ${page.path}`.toLowerCase();
  const matched = SECTION_TYPE_KEYWORDS.find(({ keywords }) => keywords.some((keyword) => haystack.includes(keyword)));
  if (matched) return matched.type;
  return isFirstPage ? "hero" : "about";
}

function buildPageSections(page: Page, elements: WireframeComponentType[], isFirstPage: boolean): Section[] {
  if (elements.length === 0) return [];

  const components: Component[] = elements.map((wireframeType, index) => ({
    id: `${page.id}-${wireframeType.toLowerCase()}-${index}`,
    type: WIREFRAME_TO_DESIGN_COMPONENT[wireframeType],
    // 원래 Wireframe/Prototype 컴포넌트 타입을 보존해 매핑으로 인한 정보 손실을 줄인다(알려진 한계 1번).
    props: { sourceType: wireframeType },
  }));

  return [
    {
      id: `${page.id}-section`,
      type: inferSectionType(page, isFirstPage),
      components,
    },
  ];
}

/** packages/design-system의 기존 토큰(tokens.ts)을 재사용하고, 없는 항목만 결정론적 기본값으로 보강한다. */
function buildEnrichedTheme(): Theme {
  return {
    colors: { ...colors },
    typography: { ...typography },
    // tokens.ts에는 spacing 팔레트가 없어 docs/03_DESIGN/DESIGN_SYSTEM.md의 8px Grid 기준값을 사용한다.
    spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", "2xl": "48px", "3xl": "64px" },
    radius: { ...radius, full: "9999px" },
    // tokens.ts에는 shadow 팔레트가 없어 DESIGN_SYSTEM.md의 Small/Medium/Large 기준값을 사용한다.
    shadow: {
      small: "0 1px 2px rgba(0, 0, 0, 0.05)",
      medium: "0 4px 6px rgba(0, 0, 0, 0.1)",
      large: "0 10px 15px rgba(0, 0, 0, 0.15)",
    },
  };
}

/**
 * PrototypeRecord → DesignDocument. Phase 1 DesignPlanRecord에 접근할 수 없으므로(registry 조회
 * 금지) metadata는 구조적 placeholder다(Phase 4·5와 동일한 이유). pages[].sections는 이번 Phase부터
 * 실제로 채워진다(위 module 주석의 알려진 한계 참고), theme도 실제 디자인 토큰으로 보강된다.
 */
export function prototypeToDesignDocument(prototype: PrototypeRecord): DesignDocument {
  const { screens, interactionMap } = prototype.content;
  const elementsByScreen = new Map(interactionMap.map((map) => [map.screen, map.interactions.map((i) => i.element)]));

  const pages: Page[] = screens.map((screen, index) => {
    const id = slugifyPath(screen.path);
    const elements = elementsByScreen.get(screen.screen) ?? [];

    return {
      id,
      title: screen.screen,
      path: screen.path,
      sections: buildPageSections({ id, title: screen.screen, path: screen.path, sections: [] }, elements, index === 0),
    };
  });

  return {
    version: DESIGN_DOCUMENT_VERSION,
    metadata: {
      projectId: prototype.planId,
      projectName: `Project ${prototype.planId}`,
      createdAt: prototype.createdAt,
      updatedAt: prototype.createdAt,
    },
    theme: buildEnrichedTheme(),
    pages,
  };
}

export interface ClaudeDesignSource {
  document: DesignDocument;
  screens: PrototypeContent["screens"];
  componentActions: PrototypeContent["componentActions"];
  interactionMap: PrototypeContent["interactionMap"];
  animationPreviews: PrototypeContent["animationPreviews"];
  userJourneys: PrototypeContent["userJourneys"];
  preview: PrototypeContent["preview"];
}

/**
 * Claude Design Generator가 실제로 소비하는 입력. `document`가 표준 백본(+ 이번 Phase부터 채워진
 * sections/theme)이고, 나머지 필드는 Phase 4 원본에서 그대로 옮긴 것이다(Adapter 내부 전용 —
 * 생성 로직은 `prototype.content`를 직접 읽지 않고 이 값만 사용한다).
 */
export function prototypeToClaudeDesignSource(prototype: PrototypeRecord): ClaudeDesignSource {
  const document = prototypeToDesignDocument(prototype);
  const { screens, componentActions, interactionMap, animationPreviews, userJourneys, preview } = prototype.content;

  return { document, screens, componentActions, interactionMap, animationPreviews, userJourneys, preview };
}
