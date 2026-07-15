import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import { COMPONENT_TYPES, type ComponentType, type ScreenLayout, type WireframeRecord } from "./wireframe";
import type {
  AnimationPreview,
  ClickFlow,
  ClickFlowStep,
  ComponentAction,
  InteractionSpec,
  NavigationEdge,
  PrototypeContent,
  PrototypePreview,
  PrototypeScreenRef,
  PrototypeUserJourney,
  ScreenInteractionMap,
  ScreenTransition,
  TransitionType,
} from "./prototype";

const TRANSITION_TYPES: TransitionType[] = ["fade", "slide-left", "slide-right", "slide-up", "modal", "none"];

interface ComponentBehavior {
  trigger: string;
  result: string;
  action: string;
  animation: string;
  animationTrigger: string;
  durationMs: number;
}

/** 13종 고정 컴포넌트 팔레트별 결정론적 인터랙션·애니메이션 정의(lib/design/wireframe.ts의 COMPONENT_TYPES와 동일한 팔레트). */
const COMPONENT_BEHAVIOR: Record<ComponentType, ComponentBehavior> = {
  Header: {
    trigger: "click",
    result: "로고 클릭 시 홈으로 이동",
    action: "Navigate Home",
    animation: "스크롤 시 상단 고정(sticky) 유지",
    animationTrigger: "onScroll",
    durationMs: 200,
  },
  Navigation: {
    trigger: "click",
    result: "선택한 메뉴의 화면으로 이동",
    action: "Navigate",
    animation: "활성 메뉴 밑줄 강조",
    animationTrigger: "onClick",
    durationMs: 150,
  },
  Sidebar: {
    trigger: "click",
    result: "선택한 항목으로 필터링하거나 해당 화면으로 이동",
    action: "Filter or Navigate",
    animation: "슬라이드로 펼쳐짐",
    animationTrigger: "onToggle",
    durationMs: 250,
  },
  Hero: {
    trigger: "click",
    result: "주요 CTA 실행(다음 화면으로 이동)",
    action: "Primary CTA",
    animation: "페이드인 + 위로 살짝 이동",
    animationTrigger: "onLoad",
    durationMs: 400,
  },
  Card: {
    trigger: "click",
    result: "상세 화면으로 이동",
    action: "Navigate to Detail",
    animation: "호버 시 살짝 부상(lift)",
    animationTrigger: "onHover",
    durationMs: 150,
  },
  Form: {
    trigger: "submit",
    result: "입력값 검증 후 다음 화면으로 이동",
    action: "Validate & Submit",
    animation: "오류 필드 흔들림(shake)",
    animationTrigger: "onError",
    durationMs: 300,
  },
  Table: {
    trigger: "click",
    result: "행 선택 시 상세 정보 표시",
    action: "Select Row",
    animation: "선택 행 하이라이트",
    animationTrigger: "onClick",
    durationMs: 100,
  },
  Dashboard: {
    trigger: "hover",
    result: "위젯 데이터 툴팁 표시",
    action: "Show Tooltip",
    animation: "숫자 카운트업 애니메이션",
    animationTrigger: "onLoad",
    durationMs: 600,
  },
  Footer: {
    trigger: "click",
    result: "하위 링크로 이동",
    action: "Navigate",
    animation: "화면 하단 진입 시 페이드인",
    animationTrigger: "onScroll",
    durationMs: 200,
  },
  Modal: {
    trigger: "click",
    result: "모달을 열어 추가 콘텐츠 표시",
    action: "Open Modal",
    animation: "중앙에서 확대되며 나타남 + 배경 딤(dim) 처리",
    animationTrigger: "onOpen",
    durationMs: 250,
  },
  Button: {
    trigger: "click",
    result: "연결된 액션 실행(다음 화면 이동 또는 제출)",
    action: "Trigger Action",
    animation: "클릭 시 눌림 효과(scale down)",
    animationTrigger: "onClick",
    durationMs: 100,
  },
  Search: {
    trigger: "submit",
    result: "검색어에 맞는 결과 목록 표시",
    action: "Search",
    animation: "결과 목록 페이드인",
    animationTrigger: "onSubmit",
    durationMs: 200,
  },
  Pagination: {
    trigger: "click",
    result: "선택한 페이지로 목록 갱신",
    action: "Change Page",
    animation: "목록 슬라이드 전환",
    animationTrigger: "onClick",
    durationMs: 200,
  },
};

/** Click Flow·Animation Preview에서 화면의 "대표 컴포넌트" 하나를 뽑을 때 쓰는 우선순위. */
const PRIMARY_COMPONENT_PRIORITY: ComponentType[] = [
  "Button",
  "Form",
  "Search",
  "Pagination",
  "Card",
  "Hero",
  "Navigation",
  "Header",
];

const SYSTEM_PROMPT =
  "You are a senior interaction/prototype designer for AI Business OS's Design Automation system " +
  "(Phase 4, built on top of the Phase 3 Wireframe). Given a project's existing wireframe screens " +
  "and their components, produce a single JSON object (no prose, no markdown fences) with exactly " +
  "these keys: screens, clickFlows, navigationFlow, screenTransitions, interactionMap, " +
  "componentActions, userJourneys, animationPreviews, preview. Every `element`/`component` value " +
  "that refers to a UI component must be one of exactly these 13 strings: " +
  COMPONENT_TYPES.join(", ") +
  ". Every screen transition `type` must be one of exactly: " +
  TRANSITION_TYPES.join(", ") +
  ". Follow the shape the user message describes exactly, and keep screen names consistent with " +
  "the wireframe screens provided.";

function componentsForScreen(layout: ScreenLayout): ComponentType[] {
  return [...new Set(layout.desktop.sections.flatMap((section) => section.components))];
}

function pickPrimaryComponent(components: ComponentType[]): ComponentType {
  return PRIMARY_COMPONENT_PRIORITY.find((type) => components.includes(type)) ?? components[0] ?? "Header";
}

function buildUserPrompt(wireframe: WireframeRecord): string {
  return `Wireframe Screens (from Phase 3's screen layouts):
${JSON.stringify(
  wireframe.content.layouts.map((layout) => ({
    screen: layout.screen,
    path: layout.path,
    components: componentsForScreen(layout),
  }))
)}

Component Inventory:
${JSON.stringify(wireframe.content.components.map((c) => c.type))}

Allowed component types: ${COMPONENT_TYPES.join(", ")}
Allowed transition types: ${TRANSITION_TYPES.join(", ")}

Return ONLY a JSON object shaped like:
{
  "screens": [{ "screen": string, "path": string }],
  "clickFlows": [{ "name": string, "steps": [{ "step": number, "screen": string, "element": string, "action": string, "leadsTo": string }] }],
  "navigationFlow": [{ "from": string, "to": string, "trigger": string }],
  "screenTransitions": [{ "from": string, "to": string, "type": string, "durationMs": number }],
  "interactionMap": [{ "screen": string, "interactions": [{ "element": string, "trigger": string, "result": string }] }],
  "componentActions": [{ "component": string, "action": string, "description": string }],
  "userJourneys": [{
    "persona": string,
    "goal": string,
    "steps": [{ "step": number, "screen": string, "action": string, "emotion"?: string }]
  }],
  "animationPreviews": [{ "screen": string, "animation": string, "trigger": string, "durationMs": number }],
  "preview": { "startScreen": string, "totalScreens": number, "totalInteractions": number, "summary": string }
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

function isComponentType(value: unknown): value is ComponentType {
  return typeof value === "string" && (COMPONENT_TYPES as string[]).includes(value);
}

function isTransitionType(value: unknown): value is TransitionType {
  return typeof value === "string" && (TRANSITION_TYPES as string[]).includes(value);
}

function isPrototypeScreenRef(value: unknown): value is PrototypeScreenRef {
  if (typeof value !== "object" || value === null) return false;
  const ref = value as Record<string, unknown>;
  return isNonEmptyString(ref.screen) && typeof ref.path === "string";
}

function isClickFlowStep(value: unknown): value is ClickFlowStep {
  if (typeof value !== "object" || value === null) return false;
  const step = value as Record<string, unknown>;
  return (
    typeof step.step === "number" &&
    isNonEmptyString(step.screen) &&
    isNonEmptyString(step.element) &&
    typeof step.action === "string" &&
    isNonEmptyString(step.leadsTo)
  );
}

function isClickFlow(value: unknown): value is ClickFlow {
  if (typeof value !== "object" || value === null) return false;
  const flow = value as Record<string, unknown>;
  return isNonEmptyString(flow.name) && Array.isArray(flow.steps) && flow.steps.every(isClickFlowStep);
}

function isNavigationEdge(value: unknown): value is NavigationEdge {
  if (typeof value !== "object" || value === null) return false;
  const edge = value as Record<string, unknown>;
  return isNonEmptyString(edge.from) && isNonEmptyString(edge.to) && typeof edge.trigger === "string";
}

function isScreenTransition(value: unknown): value is ScreenTransition {
  if (typeof value !== "object" || value === null) return false;
  const transition = value as Record<string, unknown>;
  return (
    isNonEmptyString(transition.from) &&
    isNonEmptyString(transition.to) &&
    isTransitionType(transition.type) &&
    typeof transition.durationMs === "number"
  );
}

function isInteractionSpec(value: unknown): value is InteractionSpec {
  if (typeof value !== "object" || value === null) return false;
  const spec = value as Record<string, unknown>;
  return isComponentType(spec.element) && typeof spec.trigger === "string" && typeof spec.result === "string";
}

function isScreenInteractionMap(value: unknown): value is ScreenInteractionMap {
  if (typeof value !== "object" || value === null) return false;
  const map = value as Record<string, unknown>;
  return isNonEmptyString(map.screen) && Array.isArray(map.interactions) && map.interactions.every(isInteractionSpec);
}

function isComponentAction(value: unknown): value is ComponentAction {
  if (typeof value !== "object" || value === null) return false;
  const action = value as Record<string, unknown>;
  return isComponentType(action.component) && typeof action.action === "string" && typeof action.description === "string";
}

function isPrototypeUserJourney(value: unknown): value is PrototypeUserJourney {
  if (typeof value !== "object" || value === null) return false;
  const journey = value as Record<string, unknown>;
  if (!isNonEmptyString(journey.persona) || typeof journey.goal !== "string" || !Array.isArray(journey.steps)) {
    return false;
  }
  return journey.steps.every((step) => {
    if (typeof step !== "object" || step === null) return false;
    const s = step as Record<string, unknown>;
    return (
      typeof s.step === "number" &&
      isNonEmptyString(s.screen) &&
      typeof s.action === "string" &&
      (s.emotion === undefined || typeof s.emotion === "string")
    );
  });
}

function isAnimationPreview(value: unknown): value is AnimationPreview {
  if (typeof value !== "object" || value === null) return false;
  const preview = value as Record<string, unknown>;
  return (
    isNonEmptyString(preview.screen) &&
    typeof preview.animation === "string" &&
    typeof preview.trigger === "string" &&
    typeof preview.durationMs === "number"
  );
}

function isPrototypePreview(value: unknown): value is PrototypePreview {
  if (typeof value !== "object" || value === null) return false;
  const preview = value as Record<string, unknown>;
  return (
    isNonEmptyString(preview.startScreen) &&
    typeof preview.totalScreens === "number" &&
    typeof preview.totalInteractions === "number" &&
    typeof preview.summary === "string"
  );
}

/**
 * AI 응답을 PrototypeContent로 파싱한다. 하나라도 어긋나면 null을 반환해 호출자가 결정론적
 * 기본값으로 폴백하도록 한다(lib/design/wireframe-generator.ts의 parseWireframeContent()와
 * 동일한 all-or-nothing 원칙).
 */
export function parsePrototypeContent(raw: string): PrototypeContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.screens) || !obj.screens.every(isPrototypeScreenRef)) return null;
  if (!Array.isArray(obj.clickFlows) || !obj.clickFlows.every(isClickFlow)) return null;
  if (!Array.isArray(obj.navigationFlow) || !obj.navigationFlow.every(isNavigationEdge)) return null;
  if (!Array.isArray(obj.screenTransitions) || !obj.screenTransitions.every(isScreenTransition)) return null;
  if (!Array.isArray(obj.interactionMap) || !obj.interactionMap.every(isScreenInteractionMap)) return null;
  if (!Array.isArray(obj.componentActions) || !obj.componentActions.every(isComponentAction)) return null;
  if (!Array.isArray(obj.userJourneys) || !obj.userJourneys.every(isPrototypeUserJourney)) return null;
  if (!Array.isArray(obj.animationPreviews) || !obj.animationPreviews.every(isAnimationPreview)) return null;
  if (!isPrototypePreview(obj.preview)) return null;

  return {
    screens: obj.screens,
    clickFlows: obj.clickFlows,
    navigationFlow: obj.navigationFlow,
    screenTransitions: obj.screenTransitions,
    interactionMap: obj.interactionMap,
    componentActions: obj.componentActions,
    userJourneys: obj.userJourneys,
    animationPreviews: obj.animationPreviews,
    preview: obj.preview,
  };
}

/**
 * Phase 3의 화면·컴포넌트 구성만으로 항상 유효한 Prototype을 만드는 결정론적 폴백 — Provider
 * 미설정이거나 응답 파싱에 실패해도 화면이 빈 상태가 되지 않는다(lib/design/wireframe-generator.ts의
 * buildDefaultWireframe()과 동일한 역할).
 */
export function buildDefaultPrototype(wireframe: WireframeRecord): PrototypeContent {
  const layouts = wireframe.content.layouts;
  const screens: PrototypeScreenRef[] = layouts.map((layout) => ({ screen: layout.screen, path: layout.path }));
  const componentsByScreen = new Map<string, ComponentType[]>();
  for (const layout of layouts) {
    componentsByScreen.set(layout.screen, componentsForScreen(layout));
  }

  const clickSteps: ClickFlowStep[] = layouts.map((layout, index) => {
    const components = componentsByScreen.get(layout.screen) ?? [];
    const primary = pickPrimaryComponent(components);
    const next = layouts[index + 1]?.screen ?? "Complete";

    return {
      step: index + 1,
      screen: layout.screen,
      element: primary,
      action: COMPONENT_BEHAVIOR[primary].action,
      leadsTo: next,
    };
  });
  const clickFlows: ClickFlow[] = [{ name: "Primary Flow", steps: clickSteps }];

  const navigationFlow: NavigationEdge[] = layouts.slice(0, -1).map((layout, index) => ({
    from: layout.screen,
    to: layouts[index + 1].screen,
    trigger: `${layout.screen}에서 ${layouts[index + 1].screen}로 이동`,
  }));

  const screenTransitions: ScreenTransition[] = navigationFlow.map((edge) => {
    const targetComponents = componentsByScreen.get(edge.to) ?? [];
    const isModal = targetComponents.includes("Modal");
    return {
      from: edge.from,
      to: edge.to,
      type: isModal ? "modal" : "slide-left",
      durationMs: isModal ? 250 : 300,
    };
  });

  const interactionMap: ScreenInteractionMap[] = layouts.map((layout) => {
    const components = componentsByScreen.get(layout.screen) ?? [];
    const interactions: InteractionSpec[] = components.map((type) => ({
      element: type,
      trigger: COMPONENT_BEHAVIOR[type].trigger,
      result: COMPONENT_BEHAVIOR[type].result,
    }));
    return { screen: layout.screen, interactions };
  });

  const usedComponents = [...new Set(layouts.flatMap((layout) => componentsByScreen.get(layout.screen) ?? []))];
  const componentActions: ComponentAction[] = COMPONENT_TYPES.filter((type) => usedComponents.includes(type)).map(
    (type) => ({ component: type, action: COMPONENT_BEHAVIOR[type].action, description: COMPONENT_BEHAVIOR[type].result })
  );

  const startScreen = screens[0]?.screen ?? "";
  const userJourneys: PrototypeUserJourney[] = [
    {
      persona: "일반 방문자",
      goal: `${startScreen}부터 시작해 주요 화면을 탐색하고 핵심 액션을 완료한다.`,
      steps: layouts.map((layout, index) => ({
        step: index + 1,
        screen: layout.screen,
        action: `${layout.screen} 화면에서 주요 인터랙션을 수행한다.`,
        emotion: index === layouts.length - 1 ? "만족" : "탐색",
      })),
    },
  ];

  const animationPreviews: AnimationPreview[] = layouts.map((layout) => {
    const components = componentsByScreen.get(layout.screen) ?? [];
    const primary = pickPrimaryComponent(components);
    const behavior = COMPONENT_BEHAVIOR[primary];
    return {
      screen: layout.screen,
      animation: behavior.animation,
      trigger: behavior.animationTrigger,
      durationMs: behavior.durationMs,
    };
  });

  const totalInteractions = interactionMap.reduce((sum, map) => sum + map.interactions.length, 0);
  const preview: PrototypePreview = {
    startScreen,
    totalScreens: screens.length,
    totalInteractions,
    summary: `${screens.length}개 화면, ${totalInteractions}개 인터랙션으로 구성된 프로토타입.`,
  };

  return {
    screens,
    clickFlows,
    navigationFlow,
    screenTransitions,
    interactionMap,
    componentActions,
    userJourneys,
    animationPreviews,
    preview,
  };
}

export interface GeneratePrototypeResult {
  content: PrototypeContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn`은 기본값이 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 빠르게 검증한다(Phase 1~3과 동일한 DI 패턴).
 */
export async function generatePrototype(
  wireframe: WireframeRecord,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GeneratePrototypeResult> {
  const result = await chatFn(buildUserPrompt(wireframe), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parsePrototypeContent(result.content);
    if (parsed) {
      return { content: parsed, simulated: false, provider: result.provider, model: result.model };
    }
  }

  return { content: buildDefaultPrototype(wireframe), simulated: true };
}
