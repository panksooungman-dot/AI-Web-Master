import type {
  Component,
  ComponentType as DesignComponentType,
  DesignDocument,
  Page,
  Section,
  SectionType,
} from "@cnbiz/design-system/types/design";
import { DESIGN_DOCUMENT_VERSION, buildEnrichedTheme, slugifyPath } from "./design-document-adapter";
import type {
  BreakpointLayout,
  ComponentType as WireframeComponentType,
  ScreenLayout,
  WireframeRecord,
  WireframeSection,
} from "./wireframe";
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
 *    "가장 가까운 대응"을 고정 매핑한 결정론적 근사치다. 매핑 이전의 Wireframe 타입은 보존하지
 *    않는다 — 한때 `Component.props.sourceType`에 남겼으나, React Generator
 *    (packages/cli/src/generators/react/tsx.ts:43)가 특별 처리하지 않는 props를 전부 JSX 속성으로
 *    출력하기 때문에 `<div sourceType="Header" />`가 되어 생성물이 타입체크에 실패했다. props는
 *    렌더링되는 값만 담는다. (React Generator는 `Component.type`에서 자체 `ReactComponentNode
 *    .sourceType`을 따로 만들어 두므로 렌더 트리 쪽 추적성은 그대로 유지된다 —
 *    generators/react/componentTree.ts:34.)
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
    // props는 렌더링되는 값만 담는다(알려진 한계 1번) — 아직 채울 렌더링 값이 없으므로 비워 둔다.
    // schema상 props는 필수 필드라 객체 자체는 유지한다(design.schema.json $defs.component.required).
    props: {},
  }));

  return [
    {
      id: `${page.id}-section`,
      type: inferSectionType(page, isFirstPage),
      components,
    },
  ];
}

/** WireframeSection.name → SectionType. 이름이 레이아웃 랜드마크를 그대로 가리키는 경우에만
 *  대응시키고, 나머지는 기존 inferSectionType()(페이지 텍스트 기반 추정)을 그대로 재사용한다. */
function sectionTypeForWireframeSection(
  section: WireframeSection,
  page: { title: string; path: string },
  isFirstPage: boolean
): SectionType {
  const name = section.name.toLowerCase();
  if (name.includes("footer")) return "footer";
  if (name.includes("hero")) return "hero";
  return inferSectionType(page, isFirstPage);
}

/**
 * Wireframe이 이미 만들어 둔 화면 내부의 섹션 경계(BreakpointLayout.sections)를 그대로
 * DesignDocument의 Section[]으로 옮긴다 — 위 module 주석 "알려진 한계 2번"이 "Wireframe의 섹션
 * 경계를 Prototype까지 함께 전달해야 가능하다"고 적어 둔 바로 그 복구다. 새 분류 체계를 만들지
 * 않고 기존 WIREFRAME_TO_DESIGN_COMPONENT 매핑과 inferSectionType()을 그대로 재사용한다.
 *
 * Section.layout/Page.layout/Page.responsive는 전부 packages/design-system/types/design.ts에
 * 이미 정의되어 있으나 지금까지 어떤 Adapter도 채우지 않던(optional) 필드다 — 새 타입을 만들지
 * 않고 그 자리에 Wireframe이 이미 가진 columns 값을 넣기만 한다.
 */
function buildSectionsFromWireframeLayout(
  page: { id: string; title: string; path: string },
  screenLayout: ScreenLayout,
  isFirstPage: boolean
): Section[] {
  const byName = (layout: BreakpointLayout, name: string) =>
    layout.sections.find((section) => section.name === name);

  return screenLayout.desktop.sections.map((section, sectionIndex) => {
    const slug = section.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `section-${sectionIndex}`;

    const components: Component[] = section.components.map((wireframeType, index) => ({
      id: `${page.id}-${slug}-${wireframeType.toLowerCase()}-${index}`,
      type: WIREFRAME_TO_DESIGN_COMPONENT[wireframeType],
      // props는 렌더링되는 값만 담는다(알려진 한계 1번, buildPageSections()와 동일).
      props: {},
    }));

    const tablet = byName(screenLayout.tablet, section.name);
    const mobile = byName(screenLayout.mobile, section.name);

    return {
      id: `${page.id}-${slug}`,
      type: sectionTypeForWireframeSection(section, page, isFirstPage),
      components,
      layout: { columns: screenLayout.desktop.columns },
      responsive: {
        desktop: { layout: { columns: screenLayout.desktop.columns } },
        ...(tablet ? { tablet: { layout: { columns: screenLayout.tablet.columns } } } : {}),
        ...(mobile ? { mobile: { layout: { columns: screenLayout.mobile.columns } } } : {}),
      },
    };
  });
}

/**
 * PrototypeRecord → DesignDocument. Phase 1 DesignPlanRecord에 접근할 수 없으므로(registry 조회
 * 금지) metadata는 구조적 placeholder다(Phase 4·5와 동일한 이유). theme은 실제 디자인 토큰으로 보강된다.
 *
 * `wireframe`(선택)이 주어지면 Prototype이 보존하지 못하는 정보 — 화면 내부의 섹션 경계와
 * breakpoint별 columns — 를 Wireframe 원본에서 그대로 복구한다. 주어지지 않으면 기존과 100%
 * 동일하게 interactionMap 기반으로 화면당 Section 1개를 만든다(하위 호환).
 */
export function prototypeToDesignDocument(
  prototype: PrototypeRecord,
  wireframe?: WireframeRecord | null
): DesignDocument {
  const { screens, interactionMap } = prototype.content;
  const elementsByScreen = new Map(interactionMap.map((map) => [map.screen, map.interactions.map((i) => i.element)]));
  const layoutByPath = new Map((wireframe?.content.layouts ?? []).map((layout) => [layout.path, layout]));

  const pages: Page[] = screens.map((screen, index) => {
    const id = slugifyPath(screen.path);
    const elements = elementsByScreen.get(screen.screen) ?? [];
    const screenLayout = layoutByPath.get(screen.path);

    if (!screenLayout) {
      return {
        id,
        title: screen.screen,
        path: screen.path,
        sections: buildPageSections({ id, title: screen.screen, path: screen.path, sections: [] }, elements, index === 0),
      };
    }

    return {
      id,
      title: screen.screen,
      path: screen.path,
      sections: buildSectionsFromWireframeLayout({ id, title: screen.screen, path: screen.path }, screenLayout, index === 0),
      layout: { columns: screenLayout.desktop.columns },
      responsive: {
        desktop: { layout: { columns: screenLayout.desktop.columns } },
        tablet: { layout: { columns: screenLayout.tablet.columns } },
        mobile: { layout: { columns: screenLayout.mobile.columns } },
      },
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
export function prototypeToClaudeDesignSource(
  prototype: PrototypeRecord,
  wireframe?: WireframeRecord | null
): ClaudeDesignSource {
  const document = prototypeToDesignDocument(prototype, wireframe);
  const { screens, componentActions, interactionMap, animationPreviews, userJourneys, preview } = prototype.content;

  return { document, screens, componentActions, interactionMap, animationPreviews, userJourneys, preview };
}
