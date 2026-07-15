import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { DesignPlanRecord } from "./types";
import type {
  NavigationFlowEdge,
  PageSequenceItem,
  ScreenDescription,
  ScreenFlowNode,
  StoryboardContent,
  UserJourney,
} from "./storyboard";

const SYSTEM_PROMPT =
  "You are a senior UX storyboard designer for AI Business OS's Design Automation system " +
  "(Phase 2, built on top of the Phase 1 Design Plan). Given a project's existing Site Map and " +
  "Screen List, produce a single JSON object (no prose, no markdown fences) with exactly these " +
  "keys: screenFlow, userJourneys, navigationFlow, pageSequence, screenDescriptions. Follow the " +
  "shape the user message describes exactly, and keep screen names consistent with the Screen " +
  "List provided.";

function buildUserPrompt(plan: DesignPlanRecord): string {
  return `Project Name: ${plan.input.projectName}
Project Summary: ${plan.content.requirementAnalysis.projectSummary}
Target Users: ${plan.content.requirementAnalysis.targetUsers.join(", ")}

Site Map:
${JSON.stringify(plan.content.siteMap)}

Screen List:
${JSON.stringify(plan.content.screenList)}

Return ONLY a JSON object shaped like:
{
  "screenFlow": [{ "screen": string, "path": string, "description": string }],
  "userJourneys": [{
    "persona": string,
    "goal": string,
    "steps": [{ "step": number, "screen": string, "goal": string, "emotion"?: string }]
  }],
  "navigationFlow": [{ "from": string, "to": string, "trigger": string }],
  "pageSequence": [{ "order": number, "screen": string, "path": string }],
  "screenDescriptions": [{ "screen": string, "path": string, "purpose": string, "keyElements": string[] }]
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isScreenFlowNode(value: unknown): value is ScreenFlowNode {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;
  return isNonEmptyString(node.screen) && typeof node.path === "string" && typeof node.description === "string";
}

function isNavigationFlowEdge(value: unknown): value is NavigationFlowEdge {
  if (typeof value !== "object" || value === null) return false;
  const edge = value as Record<string, unknown>;
  return isNonEmptyString(edge.from) && isNonEmptyString(edge.to) && typeof edge.trigger === "string";
}

function isPageSequenceItem(value: unknown): value is PageSequenceItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.order === "number" && isNonEmptyString(item.screen) && typeof item.path === "string";
}

function isScreenDescription(value: unknown): value is ScreenDescription {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isNonEmptyString(item.screen) &&
    typeof item.path === "string" &&
    typeof item.purpose === "string" &&
    isStringArray(item.keyElements)
  );
}

function isUserJourney(value: unknown): value is UserJourney {
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
      typeof s.goal === "string" &&
      (s.emotion === undefined || typeof s.emotion === "string")
    );
  });
}

/**
 * AI 응답을 StoryboardContent로 파싱한다. 하나라도 어긋나면 null을 반환해 호출자가 결정론적
 * 기본값으로 폴백하도록 한다(lib/design/generator.ts의 parseDesignPlanContent()와 동일한
 * all-or-nothing 원칙 — Website Builder Content Engine에서 시작된 이 저장소의 일관된 규칙).
 */
export function parseStoryboardContent(raw: string): StoryboardContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.screenFlow) || !obj.screenFlow.every(isScreenFlowNode)) return null;
  if (!Array.isArray(obj.userJourneys) || !obj.userJourneys.every(isUserJourney)) return null;
  if (!Array.isArray(obj.navigationFlow) || !obj.navigationFlow.every(isNavigationFlowEdge)) return null;
  if (!Array.isArray(obj.pageSequence) || !obj.pageSequence.every(isPageSequenceItem)) return null;
  if (!Array.isArray(obj.screenDescriptions) || !obj.screenDescriptions.every(isScreenDescription)) return null;

  return {
    screenFlow: obj.screenFlow,
    userJourneys: obj.userJourneys,
    navigationFlow: obj.navigationFlow,
    pageSequence: obj.pageSequence,
    screenDescriptions: obj.screenDescriptions,
  };
}

/**
 * Phase 1의 Site Map/Screen List만으로 항상 유효한 Storyboard를 만드는 결정론적 폴백 —
 * Provider 미설정이거나 응답 파싱에 실패해도 화면이 빈 상태가 되지 않는다
 * (lib/design/generator.ts의 buildDefaultDesignPlan()과 동일한 역할).
 */
export function buildDefaultStoryboard(plan: DesignPlanRecord): StoryboardContent {
  const screens = plan.content.screenList;
  const persona = plan.content.requirementAnalysis.targetUsers[0] ?? "일반 방문자";

  const screenFlow: ScreenFlowNode[] = screens.map((screen) => ({
    screen: screen.name,
    path: screen.path,
    description: screen.description,
  }));

  const navigationFlow: NavigationFlowEdge[] = screens.slice(0, -1).map((screen, index) => ({
    from: screen.name,
    to: screens[index + 1].name,
    trigger: `${screen.name}에서 다음 화면으로 이동`,
  }));

  const pageSequence: PageSequenceItem[] = screens.map((screen, index) => ({
    order: index + 1,
    screen: screen.name,
    path: screen.path,
  }));

  const screenDescriptions: ScreenDescription[] = screens.map((screen) => ({
    screen: screen.name,
    path: screen.path,
    purpose: screen.description,
    keyElements: screen.components,
  }));

  const userJourneys: UserJourney[] = [
    {
      persona,
      goal: `${plan.input.projectName} 웹사이트에서 필요한 정보를 확인하고 문의를 남긴다.`,
      steps: screens.map((screen, index) => ({
        step: index + 1,
        screen: screen.name,
        goal: screen.description,
        emotion: index === screens.length - 1 ? "만족" : "탐색",
      })),
    },
  ];

  return { screenFlow, userJourneys, navigationFlow, pageSequence, screenDescriptions };
}

export interface GenerateStoryboardResult {
  content: StoryboardContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn`은 기본값이 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 빠르게 검증한다(Phase 1 lib/design/generator.ts와 동일한 DI 패턴).
 */
export async function generateStoryboard(
  plan: DesignPlanRecord,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateStoryboardResult> {
  const result = await chatFn(buildUserPrompt(plan), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parseStoryboardContent(result.content);
    if (parsed) {
      return { content: parsed, simulated: false, provider: result.provider, model: result.model };
    }
  }

  return { content: buildDefaultStoryboard(plan), simulated: true };
}
