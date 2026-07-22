import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { PrototypeRecord } from "./prototype";
import type { ClaudeDesignContent } from "./claude-design";
import { prototypeToClaudeDesignSource, type ClaudeDesignSource } from "./claude-design-document-adapter";

const SYSTEM_PROMPT =
  "You are a senior design prompt engineer for AI Business OS's Design Automation system " +
  "(Phase 5, built on top of the Phase 4 Prototype). Given a project's existing prototype " +
  "(screens, interactions, component actions, animation previews, user journeys), produce a " +
  "single JSON object (no prose, no markdown fences) with exactly these keys: designPrompt, " +
  "uiPrompt, componentPrompt, themePrompt, layoutPrompt. Every value must be a non-empty string " +
  "written as a ready-to-use prompt that could be handed directly to a design/image-generation " +
  "tool (such as Claude Design) to actually render the UI. Follow the shape the user message " +
  "describes exactly, and keep screen/component names consistent with the prototype provided.";

/** `source`는 prototypeToClaudeDesignSource()가 만든 DesignDocument 기준 입력(Phase 6 Adapter). */
function buildUserPrompt(source: ClaudeDesignSource): string {
  return `Design Document Pages (id/title/path/sections — docs/architecture/DESIGN_JSON_SPEC.md):
${JSON.stringify(source.document.pages)}

Design Document Theme:
${JSON.stringify(source.document.theme)}

Prototype Screens (from Phase 4's prototype):
${JSON.stringify(source.screens)}

Component Actions:
${JSON.stringify(source.componentActions)}

Interaction Map:
${JSON.stringify(source.interactionMap)}

Animation Previews:
${JSON.stringify(source.animationPreviews)}

User Journeys:
${JSON.stringify(source.userJourneys)}

Prototype Preview Summary:
${JSON.stringify(source.preview)}

Return ONLY a JSON object shaped like:
{
  "designPrompt": string,
  "uiPrompt": string,
  "componentPrompt": string,
  "themePrompt": string,
  "layoutPrompt": string
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

/**
 * AI 응답을 ClaudeDesignContent로 파싱한다. 하나라도 어긋나면 null을 반환해 호출자가 결정론적
 * 기본값으로 폴백하도록 한다(lib/design/prototype-generator.ts의 parsePrototypeContent()와
 * 동일한 all-or-nothing 원칙).
 */
export function parseClaudeDesignContent(raw: string): ClaudeDesignContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (!isNonEmptyString(obj.designPrompt)) return null;
  if (!isNonEmptyString(obj.uiPrompt)) return null;
  if (!isNonEmptyString(obj.componentPrompt)) return null;
  if (!isNonEmptyString(obj.themePrompt)) return null;
  if (!isNonEmptyString(obj.layoutPrompt)) return null;

  return {
    designPrompt: obj.designPrompt,
    uiPrompt: obj.uiPrompt,
    componentPrompt: obj.componentPrompt,
    themePrompt: obj.themePrompt,
    layoutPrompt: obj.layoutPrompt,
  };
}

/**
 * DesignDocument(+ Phase 4 원본에서 그대로 옮긴 화면·인터랙션·컴포넌트 구성)만으로 항상 유효한
 * 5종 프롬프트를 만드는 결정론적 폴백 — Provider 미설정이거나 응답 파싱에 실패해도 화면이 빈
 * 상태가 되지 않는다(lib/design/prototype-generator.ts의 buildDefaultPrototype()과 동일한 역할).
 */
export function buildDefaultClaudeDesign(prototype: PrototypeRecord): ClaudeDesignContent {
  return buildClaudeDesignFromSource(prototypeToClaudeDesignSource(prototype));
}

function buildClaudeDesignFromSource(source: ClaudeDesignSource): ClaudeDesignContent {
  const { screens, componentActions, interactionMap, animationPreviews, userJourneys, preview } = source;

  const screenNames = screens.map((s) => s.screen).join(", ") || "the site's screens";
  const componentNames = [...new Set(componentActions.map((a) => a.component))];
  const primaryJourney = userJourneys[0];

  const designPrompt =
    `Design a ${screens.length}-screen web application covering: ${screenNames}. ${preview.summary} ` +
    `Start screen: ${preview.startScreen}. ` +
    (primaryJourney
      ? `Primary user journey: "${primaryJourney.persona}" aims to ${primaryJourney.goal}. `
      : "") +
    `Design each screen so its layout and components directly support that journey, and keep navigation between ${screenNames} clear and consistent.`;

  const uiPrompt =
    `For each screen (${screenNames}), design a clean, modern UI that surfaces its key interactions: ` +
    interactionMap
      .map((map) => `${map.screen} (${map.interactions.map((i) => `${i.element}: ${i.result}`).join("; ")})`)
      .join(" | ") +
    `. Maintain visual consistency across all screens (spacing, typography, iconography) and prioritize clarity over decoration.`;

  const componentPrompt =
    `Design the following reusable components: ${componentNames.join(", ") || "the components used across screens"}. ` +
    componentActions.map((a) => `${a.component} — ${a.action}: ${a.description}`).join(" ") +
    ` Each component should be visually distinct, accessible (keyboard-navigable, sufficient color contrast), and reusable across screens.`;

  const themePrompt =
    `Define a cohesive visual theme (color palette, typography scale, spacing system, border radius, shadows) ` +
    `suitable for this application. Use an 8px spacing grid, a primary/secondary/accent color scheme with ` +
    `sufficient contrast for accessibility, and a type scale that clearly distinguishes headings from body text. ` +
    `Apply the theme consistently across ${componentNames.join(", ") || "all components"}.`;

  const layoutPrompt =
    `Lay out each screen (${screenNames}) responsively across desktop, tablet, and mobile breakpoints. ` +
    (animationPreviews.length > 0
      ? animationPreviews
          .map((a) => `${a.screen}: ${a.animation} (${a.trigger}, ${a.durationMs}ms)`)
          .join(" | ") + " "
      : "") +
    `Ensure the layout gracefully adapts — collapsing navigation, stacking sections, and resizing grids — while preserving the interactions described above.`;

  return { designPrompt, uiPrompt, componentPrompt, themePrompt, layoutPrompt };
}

export interface GenerateClaudeDesignResult {
  content: ClaudeDesignContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn`은 기본값이 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 빠르게 검증한다(Phase 1~4와 동일한 DI 패턴).
 */
export async function generateClaudeDesign(
  prototype: PrototypeRecord,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateClaudeDesignResult> {
  const source = prototypeToClaudeDesignSource(prototype);
  const result = await chatFn(buildUserPrompt(source), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parseClaudeDesignContent(result.content);
    if (parsed) {
      return { content: parsed, simulated: false, provider: result.provider, model: result.model };
    }
  }

  return { content: buildDefaultClaudeDesign(prototype), simulated: true };
}
