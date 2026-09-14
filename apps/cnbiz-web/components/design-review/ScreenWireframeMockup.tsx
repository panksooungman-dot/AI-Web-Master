"use client";

/**
 * "내가 원하는 스토리보드는 구현이 않되어 있는데" → "화면 자체의 시각적 목업"(2026-09-14) —
 * 지금까지 의뢰자 공개 페이지(design-review)는 화면 흐름도(ScreenFlowDiagram, 화면 사이의
 * 이동 관계)와 텍스트 설명만 있었고, 정작 각 화면 "안에" 무엇이 어떻게 배치되는지는 이름표가
 * 붙은 카드(Header/Hero/Footer 같은 라벨)로만 표현되어 실제 화면처럼 보이지 않았다. 이
 * 컴포넌트는 Phase 3(Wireframe)의 구조 데이터(화면당 Desktop/Tablet/Mobile 섹션 구성)를 실제
 * 화면 프레임 안에 배치된 저해상도 스케치(로고 자리·제목 바·버튼 알약·카드 격자 등)로 그려,
 * "이 화면이 실제로 이런 모양이 된다"는 감을 준다. 정밀한 실제 디자인(색상·이미지)은 아직 이
 * 단계의 목적이 아니다 — 그건 Website Build 이후에나 나온다. 여기서는 "구조가 실제로 어떻게
 * 시각화되는지"만 보여준다.
 *
 * "실행하는 화면을 보고 싶고 프로토콜까지는 아니고 ... 구체적으로 표현해줘"(2026-09-14, 배포된
 * 첫 버전을 실제로 본 뒤) — 처음 버전은 각 조각이 이름 없는 회색 막대·점(추상 스케치)뿐이라
 * "이 막대가 정확히 뭘 나타내는지"를 의뢰자가 짐작해야 했다. 인터랙티브 프로토타입(클릭 이동
 * 가능한 실제 화면)까지는 이번 범위가 아니므로, 대신 각 조각 위에 그게 무엇인지 짧은 한글
 * 캡션을 붙이고, Header/Navigation/Footer의 메뉴 항목은 추상적인 점 3개 대신 이 프로젝트의
 * 실제 화면 목록(사이트맵)에서 가져온 진짜 페이지 이름을 보여주도록 구체화했다 — 여전히
 * 색상·이미지·실제 마케팅 문구는 없는 스케치이지만, "이 자리에 뭐가 들어가는지"는 이제 라벨로
 * 명확히 알 수 있다.
 *
 * lib/design/wireframe.ts는 서버 전용(fs 기반 registry)이라 그 모듈을 전혀 import하지 않고,
 * 필요한 모양만 이 파일 안에서 독립적으로 정의한다(WireframeBoardView.tsx가 COMPONENT_TYPES를
 * 로컬에 복제해 쓰는 것과 동일한 이유 — 구조적 타이핑이라 실제 데이터(ComponentType[])를 그대로
 * 넘겨도 문제없이 맞는다).
 */

export type MockupBreakpoint = "desktop" | "tablet" | "mobile";

interface MockupSection {
  name: string;
  components: string[];
}

interface MockupBreakpointLayout {
  sections: MockupSection[];
}

export interface MockupScreen {
  screen: string;
  path: string;
  desktop: MockupBreakpointLayout;
  tablet: MockupBreakpointLayout;
  mobile: MockupBreakpointLayout;
}

const FRAME_ASPECT: Record<MockupBreakpoint, string> = {
  desktop: "aspect-[16/10]",
  tablet: "aspect-[3/4]",
  mobile: "aspect-[9/16]",
};

const BREAKPOINT_LABEL: Record<MockupBreakpoint, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

/** 메뉴류(Header/Navigation/Footer)에 실제 페이지 이름을 몇 개까지 나열할지. */
const MAX_NAV_ITEMS = 5;

export function ScreenWireframeMockup({
  screens,
  breakpoint,
  onBreakpointChange,
}: {
  screens: MockupScreen[];
  breakpoint: MockupBreakpoint;
  onBreakpointChange: (next: MockupBreakpoint) => void;
}) {
  if (screens.length === 0) return null;

  // Header/Navigation/Footer가 나열할 "이 프로젝트의 실제 화면 이름" — 전체 사이트맵 기준으로
  // 항상 동일한 목록을 쓴다(화면마다 자기 자신 이름을 포함한 전체 목록을 그대로 보여주는 것이,
  // 실제 사이트의 전역 내비게이션과 가장 가깝게 느껴진다).
  const pageNames = screens.map((s) => s.screen);

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {(Object.keys(BREAKPOINT_LABEL) as MockupBreakpoint[]).map((bp) => (
          <button
            key={bp}
            type="button"
            onClick={() => onBreakpointChange(bp)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              breakpoint === bp ? "bg-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {BREAKPOINT_LABEL[bp]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {screens.map((screen) => (
          <ScreenFrame key={screen.screen} screen={screen} breakpoint={breakpoint} pageNames={pageNames} />
        ))}
      </div>
    </div>
  );
}

function ScreenFrame({
  screen,
  breakpoint,
  pageNames,
}: {
  screen: MockupScreen;
  breakpoint: MockupBreakpoint;
  pageNames: string[];
}) {
  const layout = screen[breakpoint];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-semibold text-slate-900">{screen.screen}</p>
        <p className="shrink-0 font-mono text-xs text-slate-400">{screen.path}</p>
      </div>
      <div
        className={`overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm ${FRAME_ASPECT[breakpoint]}`}
      >
        <div className="flex h-4 shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-100 px-2">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden />
        </div>
        <div className="flex h-[calc(100%-1rem)] flex-col gap-1.5 overflow-y-auto p-1.5">
          {layout.sections.map((section, i) => (
            <SectionBlock key={`${section.name}-${i}`} section={section} pageNames={pageNames} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ section, pageNames }: { section: MockupSection; pageNames: string[] }) {
  return (
    <div className="relative rounded border border-dashed border-slate-200 bg-slate-50/60 p-1.5 pt-2">
      <span className="pointer-events-none absolute -top-1.5 left-1.5 bg-white px-1 text-[9px] font-medium tracking-wide text-slate-400">
        {section.name}
      </span>
      <div className="flex flex-col gap-1.5">
        {section.components.map((type, i) => (
          <ComponentGlyph key={`${type}-${i}`} type={type} pageNames={pageNames} />
        ))}
      </div>
    </div>
  );
}

/** 실제 페이지 이름들을 작은 링크 알약으로 나열한다 — 5개 넘으면 "외 N개"로 줄인다. */
function NavPills({ pageNames, align = "start" }: { pageNames: string[]; align?: "start" | "center" }) {
  const shown = pageNames.slice(0, MAX_NAV_ITEMS);
  const rest = pageNames.length - shown.length;
  return (
    <div className={`flex flex-wrap gap-1 ${align === "center" ? "justify-center" : "justify-end"}`}>
      {shown.map((name, i) => (
        <span
          key={`${name}-${i}`}
          className="whitespace-nowrap rounded-full bg-slate-100 px-1.5 py-0.5 text-[7px] leading-none text-slate-500"
        >
          {name}
        </span>
      ))}
      {rest > 0 && <span className="text-[7px] leading-none text-slate-400">외 {rest}개</span>}
    </div>
  );
}

/** 작은 회색 캡션 한 줄 — "이 조각이 무엇을 나타내는지"를 짧은 한글로 알려준다. */
function GlyphCaption({ children }: { children: string }) {
  return <p className="text-[7px] leading-none text-slate-400">{children}</p>;
}

/**
 * 화면 구성 요소 13종을 저해상도 스케치 + 짧은 한글 캡션으로 표현한다. Header/Navigation/
 * Footer는 이 프로젝트의 실제 화면 이름(pageNames)을 메뉴 항목으로 그대로 보여준다. 알 수 없는
 * 타입은 단순 캡션+바로 폴백.
 */
function ComponentGlyph({ type, pageNames }: { type: string; pageNames: string[] }) {
  switch (type) {
    case "Header":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>로고 + 메뉴</GlyphCaption>
          <div className="flex items-center justify-between gap-1 rounded bg-white px-1.5 py-1">
            <span className="h-2 w-2 shrink-0 rounded-sm bg-primary/40" aria-hidden />
            <NavPills pageNames={pageNames} />
          </div>
        </div>
      );
    case "Navigation":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>메뉴</GlyphCaption>
          <NavPills pageNames={pageNames} align="center" />
        </div>
      );
    case "Sidebar":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>사이드 메뉴</GlyphCaption>
          <div className="flex flex-col gap-1">
            {pageNames.slice(0, 4).map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="truncate rounded bg-slate-100 px-1.5 py-0.5 text-[7px] leading-none text-slate-500"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      );
    case "Hero":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>제목 · 부제목 · 버튼</GlyphCaption>
          <div className="flex flex-col items-center gap-1 rounded bg-slate-100 py-2.5">
            <span className="h-1.5 w-2/3 rounded-full bg-slate-300" aria-hidden />
            <span className="h-1 w-1/2 rounded-full bg-slate-200" aria-hidden />
            <span className="mt-1 h-2.5 w-10 rounded-full bg-primary/30" aria-hidden />
          </div>
        </div>
      );
    case "Card":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>카드 3개 (이미지·제목·설명)</GlyphCaption>
          <div className="grid grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-0.5 rounded border border-slate-200 bg-white p-1">
                <span className="h-3 w-full rounded-sm bg-slate-200" aria-hidden />
                <span className="h-1 w-full rounded-full bg-slate-200" aria-hidden />
              </div>
            ))}
          </div>
        </div>
      );
    case "Form":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>입력창 2개 + 제출 버튼</GlyphCaption>
          <div className="flex flex-col gap-1">
            <span className="h-2 w-full rounded border border-slate-200 bg-white" aria-hidden />
            <span className="h-2 w-full rounded border border-slate-200 bg-white" aria-hidden />
            <span className="ml-auto h-2 w-8 rounded-full bg-primary/30" aria-hidden />
          </div>
        </div>
      );
    case "Table":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>표 (제목행 + 데이터행)</GlyphCaption>
          <div className="flex flex-col gap-0.5">
            <span className="h-1.5 w-full rounded-sm bg-slate-300" aria-hidden />
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-full rounded-sm bg-slate-100" aria-hidden />
            ))}
          </div>
        </div>
      );
    case "Dashboard":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>통계 카드 4개</GlyphCaption>
          <div className="grid grid-cols-2 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-0.5 rounded border border-slate-200 bg-white p-1">
                <span className="h-1.5 w-1/2 rounded-full bg-primary/30" aria-hidden />
                <span className="h-1 w-3/4 rounded-full bg-slate-200" aria-hidden />
              </div>
            ))}
          </div>
        </div>
      );
    case "Footer":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>하단 링크</GlyphCaption>
          <div className="grid grid-cols-3 gap-1 rounded bg-slate-100 p-1">
            {[0, 1, 2].map((col) => (
              <div key={col} className="flex flex-col gap-0.5">
                {pageNames.filter((_, i) => i % 3 === col).slice(0, 3).map((name, i) => (
                  <span key={`${name}-${i}`} className="truncate text-[7px] leading-none text-slate-500">
                    {name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case "Modal":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>팝업창</GlyphCaption>
          <div className="flex items-center justify-center rounded bg-slate-200/60 py-2">
            <div className="w-2/3 rounded border border-slate-300 bg-white p-1 shadow-sm">
              <span className="block h-1.5 w-1/2 rounded-full bg-slate-300" aria-hidden />
            </div>
          </div>
        </div>
      );
    case "Search":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>검색창</GlyphCaption>
          <div className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-1">
            <span className="h-2 w-2 rounded-full border border-slate-300" aria-hidden />
            <span className="h-1 flex-1 rounded-full bg-slate-100" aria-hidden />
          </div>
        </div>
      );
    case "Pagination":
      return (
        <div className="flex flex-col gap-1">
          <GlyphCaption>페이지 번호</GlyphCaption>
          <div className="flex justify-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-2 w-2 rounded-sm bg-slate-200" aria-hidden />
            ))}
          </div>
        </div>
      );
    case "Button":
      return (
        <div className="flex flex-col items-center gap-1">
          <GlyphCaption>버튼</GlyphCaption>
          <span className="mx-auto block h-2 w-10 rounded-full bg-primary/30" aria-hidden />
        </div>
      );
    default:
      return <span className="block h-1.5 w-full rounded-full bg-slate-200" aria-hidden />;
  }
}
