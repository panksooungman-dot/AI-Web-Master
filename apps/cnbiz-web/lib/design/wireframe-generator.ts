import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { StoryboardRecord } from "./storyboard";
import { storyboardToWireframeSource, type WireframeSource } from "./wireframe-document-adapter";
import {
  COMPONENT_TYPES,
  type Breakpoint,
  type BreakpointLayout,
  type ComponentType,
  type ResponsiveBehavior,
  type ResponsiveLayout,
  type ScreenLayout,
  type WireframeComponentSpec,
  type WireframeContent,
  type WireframeSection,
} from "./wireframe";

const COMPONENT_NOTES: Record<ComponentType, string> = {
  Header: "상단 로고·주 내비게이션이 위치하는 영역",
  Navigation: "주요 메뉴 링크 모음",
  Sidebar: "보조 메뉴·필터를 위한 측면 영역",
  Hero: "핵심 메시지와 CTA를 담은 상단 비주얼 영역",
  Card: "정보를 그리드로 보여주는 카드 블록",
  Form: "사용자 입력을 받는 폼 영역",
  Table: "구조화된 데이터를 행/열로 표시",
  Dashboard: "요약 지표·위젯을 모아 보여주는 영역",
  Footer: "하단 링크·저작권 정보 영역",
  Modal: "오버레이로 뜨는 팝업 콘텐츠",
  Button: "주요 액션을 트리거하는 버튼",
  Search: "검색어 입력 및 결과 트리거",
  Pagination: "목록 결과를 페이지 단위로 이동",
};

const SYSTEM_PROMPT =
  "You are a senior UI wireframe designer for AI Business OS's Design Automation system " +
  "(Phase 3, built on top of the Phase 2 Storyboard). Given a project's existing screen list, " +
  "produce a single JSON object (no prose, no markdown fences) with exactly these keys: layouts, " +
  "components, responsive. Every component `type` value must be one of exactly these 13 strings: " +
  COMPONENT_TYPES.join(", ") +
  ". Follow the shape the user message describes exactly, and keep screen names consistent with " +
  "the screen list provided.";

/** `source`는 storyboardToWireframeSource()가 만든 DesignDocument 기준 입력(Phase 4 Adapter). */
function buildUserPrompt(source: WireframeSource): string {
  return `Design Document Pages (id/title/path — docs/architecture/DESIGN_JSON_SPEC.md):
${JSON.stringify(source.document.pages.map((page) => ({ id: page.id, title: page.title, path: page.path })))}

Screens (key elements per page):
${JSON.stringify(source.screens)}

Allowed component types: ${COMPONENT_TYPES.join(", ")}

Return ONLY a JSON object shaped like:
{
  "layouts": [{
    "screen": string,
    "path": string,
    "desktop": { "breakpoint": "desktop", "columns": number, "sections": [{ "name": string, "components": string[], "description": string }] },
    "tablet": { "breakpoint": "tablet", "columns": number, "sections": [...same shape] },
    "mobile": { "breakpoint": "mobile", "columns": number, "sections": [...same shape] }
  }],
  "components": [{ "type": string, "usedIn": string[], "notes": string }],
  "responsive": {
    "desktop": { "breakpoint": "desktop", "minWidth": number, "columns": number, "notes": string },
    "tablet": { "breakpoint": "tablet", "minWidth": number, "columns": number, "notes": string },
    "mobile": { "breakpoint": "mobile", "minWidth": number, "columns": number, "notes": string }
  }
}`;
}

/** ```json ... ``` 코드펜스로 감싸서 응답하는 모델 습관을 방어적으로 벗겨낸다(lib/design/generator.ts와 동일). */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBreakpoint(value: unknown): value is Breakpoint {
  return value === "desktop" || value === "tablet" || value === "mobile";
}

function isComponentType(value: unknown): value is ComponentType {
  return typeof value === "string" && (COMPONENT_TYPES as string[]).includes(value);
}

function isComponentTypeArray(value: unknown): value is ComponentType[] {
  return Array.isArray(value) && value.every(isComponentType);
}

function isWireframeSection(value: unknown): value is WireframeSection {
  if (typeof value !== "object" || value === null) return false;
  const section = value as Record<string, unknown>;
  return (
    isNonEmptyString(section.name) &&
    isComponentTypeArray(section.components) &&
    typeof section.description === "string"
  );
}

function isBreakpointLayout(value: unknown): value is BreakpointLayout {
  if (typeof value !== "object" || value === null) return false;
  const layout = value as Record<string, unknown>;
  return (
    isBreakpoint(layout.breakpoint) &&
    typeof layout.columns === "number" &&
    Array.isArray(layout.sections) &&
    layout.sections.every(isWireframeSection)
  );
}

function isScreenLayout(value: unknown): value is ScreenLayout {
  if (typeof value !== "object" || value === null) return false;
  const layout = value as Record<string, unknown>;
  return (
    isNonEmptyString(layout.screen) &&
    typeof layout.path === "string" &&
    isBreakpointLayout(layout.desktop) &&
    isBreakpointLayout(layout.tablet) &&
    isBreakpointLayout(layout.mobile)
  );
}

function isWireframeComponentSpec(value: unknown): value is WireframeComponentSpec {
  if (typeof value !== "object" || value === null) return false;
  const spec = value as Record<string, unknown>;
  return (
    isComponentType(spec.type) &&
    Array.isArray(spec.usedIn) &&
    spec.usedIn.every((s) => typeof s === "string") &&
    typeof spec.notes === "string"
  );
}

function isResponsiveBehavior(value: unknown): value is ResponsiveBehavior {
  if (typeof value !== "object" || value === null) return false;
  const behavior = value as Record<string, unknown>;
  return (
    isBreakpoint(behavior.breakpoint) &&
    typeof behavior.minWidth === "number" &&
    typeof behavior.columns === "number" &&
    typeof behavior.notes === "string"
  );
}

function isResponsiveLayout(value: unknown): value is ResponsiveLayout {
  if (typeof value !== "object" || value === null) return false;
  const layout = value as Record<string, unknown>;
  return (
    isResponsiveBehavior(layout.desktop) &&
    isResponsiveBehavior(layout.tablet) &&
    isResponsiveBehavior(layout.mobile)
  );
}

/**
 * AI 응답을 WireframeContent로 파싱한다. 하나라도 어긋나면 null을 반환해 호출자가 결정론적
 * 기본값으로 폴백하도록 한다(lib/design/storyboard-generator.ts의 parseStoryboardContent()와
 * 동일한 all-or-nothing 원칙).
 */
export function parseWireframeContent(raw: string): WireframeContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.layouts) || !obj.layouts.every(isScreenLayout)) return null;
  if (!Array.isArray(obj.components) || !obj.components.every(isWireframeComponentSpec)) return null;
  if (!isResponsiveLayout(obj.responsive)) return null;

  return {
    layouts: obj.layouts,
    components: obj.components,
    responsive: obj.responsive,
  };
}

const DEFAULT_RESPONSIVE: ResponsiveLayout = {
  desktop: { breakpoint: "desktop", minWidth: 1024, columns: 12, notes: "전체 그리드·Sidebar 병행 노출." },
  tablet: { breakpoint: "tablet", minWidth: 640, columns: 8, notes: "2열 그리드, Sidebar는 접히거나 Main Content 위로 이동." },
  mobile: { breakpoint: "mobile", minWidth: 0, columns: 4, notes: "1열 스택, Navigation은 Header의 햄버거 메뉴로 축약." },
};

function normalizeComponentType(raw: string): ComponentType | null {
  const target = raw.trim().toLowerCase();
  return COMPONENT_TYPES.find((type) => type.toLowerCase() === target) ?? null;
}

function buildBreakpointLayout(breakpoint: Breakpoint, columns: number, sections: WireframeSection[]): BreakpointLayout {
  return { breakpoint, columns, sections: sections.map((section) => ({ ...section, components: [...section.components] })) };
}

function buildSections(components: ComponentType[]): WireframeSection[] {
  const sections: WireframeSection[] = [];
  const remaining = new Set(components);

  if (remaining.has("Header")) {
    sections.push({ name: "Header", components: ["Header"], description: COMPONENT_NOTES.Header });
    remaining.delete("Header");
  }
  if (remaining.has("Navigation")) {
    sections.push({ name: "Navigation", components: ["Navigation"], description: COMPONENT_NOTES.Navigation });
    remaining.delete("Navigation");
  }
  if (remaining.has("Hero")) {
    sections.push({ name: "Hero", components: ["Hero"], description: COMPONENT_NOTES.Hero });
    remaining.delete("Hero");
  }
  if (remaining.has("Footer")) {
    remaining.delete("Footer");
  }

  const mainContent = COMPONENT_TYPES.filter((type) => remaining.has(type));
  if (mainContent.length > 0) {
    sections.push({
      name: "Main Content",
      components: mainContent,
      description: mainContent.map((type) => COMPONENT_NOTES[type]).join(" / "),
    });
  }

  if (components.includes("Footer")) {
    sections.push({ name: "Footer", components: ["Footer"], description: COMPONENT_NOTES.Footer });
  }

  return sections;
}

/**
 * DesignDocument(+ Phase 2 원본으로 보강된 keyElements)만으로 항상 유효한 Wireframe을 만드는
 * 결정론적 폴백 — Provider 미설정이거나 응답 파싱에 실패해도 화면이 빈 상태가 되지 않는다
 * (lib/design/storyboard-generator.ts의 buildDefaultStoryboard()와 동일한 역할). 화면 구조 자체는
 * storyboardToWireframeSource()가 DesignDocument.pages를 기준으로 만든 `screens`에서 가져온다.
 */
export function buildDefaultWireframe(storyboard: StoryboardRecord): WireframeContent {
  return buildWireframeFromSource(storyboardToWireframeSource(storyboard));
}

function buildWireframeFromSource(source: WireframeSource): WireframeContent {
  const screens = source.screens;

  const layouts: ScreenLayout[] = screens.map((screen) => {
    const matched = screen.keyElements
      .map(normalizeComponentType)
      .filter((type): type is ComponentType => type !== null);
    const components = matched.length > 0 ? matched : (["Header", "Hero", "Footer"] as ComponentType[]);
    const sections = buildSections(components);

    return {
      screen: screen.screen,
      path: screen.path,
      desktop: buildBreakpointLayout("desktop", 12, sections),
      tablet: buildBreakpointLayout("tablet", 8, sections),
      mobile: buildBreakpointLayout("mobile", 4, sections),
    };
  });

  const usageByType = new Map<ComponentType, string[]>();
  for (const layout of layouts) {
    const usedTypes = new Set(layout.desktop.sections.flatMap((section) => section.components));
    for (const type of usedTypes) {
      const screens2 = usageByType.get(type) ?? [];
      screens2.push(layout.screen);
      usageByType.set(type, screens2);
    }
  }

  const components: WireframeComponentSpec[] = COMPONENT_TYPES.filter((type) => usageByType.has(type)).map(
    (type) => ({ type, usedIn: usageByType.get(type) ?? [], notes: COMPONENT_NOTES[type] })
  );

  return { layouts, components, responsive: DEFAULT_RESPONSIVE };
}

export interface GenerateWireframeResult {
  content: WireframeContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn`은 기본값이 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 빠르게 검증한다(Phase 1·2와 동일한 DI 패턴).
 */
export async function generateWireframe(
  storyboard: StoryboardRecord,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateWireframeResult> {
  const source = storyboardToWireframeSource(storyboard);
  const result = await chatFn(buildUserPrompt(source), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parseWireframeContent(result.content);
    if (parsed) {
      return { content: parsed, simulated: false, provider: result.provider, model: result.model };
    }
  }

  return { content: buildDefaultWireframe(storyboard), simulated: true };
}
