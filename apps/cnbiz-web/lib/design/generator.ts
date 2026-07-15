import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type {
  DesignPlanContent,
  DesignPlanInput,
  FeatureItem,
  ScreenListItem,
  SiteMapNode,
  UserFlow,
} from "./types";

const SYSTEM_PROMPT =
  "You are a senior product planner for AI Business OS's Design Automation system (Phase 1). " +
  "Given a project brief, produce a single JSON object (no prose, no markdown fences) with exactly " +
  "these keys: requirementAnalysis, featureList, siteMap, userFlows, screenList. Follow the shape " +
  "the user message describes exactly.";

function buildUserPrompt(input: DesignPlanInput): string {
  return `Project Name: ${input.projectName}
Project Type: ${input.projectType}
Target Users: ${input.targetUsers}
Customer Requirements:
${input.requirements}

Return ONLY a JSON object shaped like:
{
  "requirementAnalysis": {
    "projectSummary": string,
    "functionalRequirements": string[],
    "nonFunctionalRequirements": string[],
    "businessRules": string[],
    "targetUsers": string[]
  },
  "featureList": [{ "name": string, "description": string, "priority": "High"|"Medium"|"Low" }],
  "siteMap": [{ "path": string, "title": string, "children"?: [...same shape] }],
  "userFlows": [{ "name": string, "steps": [{ "step": number, "screen": string, "action": string, "next": string }] }],
  "screenList": [{ "name": string, "path": string, "description": string, "components": string[] }]
}`;
}

/** ```json ... ``` 코드펜스로 감싸서 응답하는 모델 습관을 방어적으로 벗겨낸다. */
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

function isFeatureItem(value: unknown): value is FeatureItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isNonEmptyString(item.name) &&
    typeof item.description === "string" &&
    (item.priority === "High" || item.priority === "Medium" || item.priority === "Low")
  );
}

function isSiteMapNode(value: unknown): value is SiteMapNode {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;
  if (typeof node.path !== "string" || !isNonEmptyString(node.title)) return false;
  if (node.children === undefined) return true;
  return Array.isArray(node.children) && node.children.every(isSiteMapNode);
}

function isUserFlow(value: unknown): value is UserFlow {
  if (typeof value !== "object" || value === null) return false;
  const flow = value as Record<string, unknown>;
  if (!isNonEmptyString(flow.name) || !Array.isArray(flow.steps)) return false;
  return flow.steps.every((step) => {
    if (typeof step !== "object" || step === null) return false;
    const s = step as Record<string, unknown>;
    return (
      typeof s.step === "number" &&
      isNonEmptyString(s.screen) &&
      typeof s.action === "string" &&
      typeof s.next === "string"
    );
  });
}

function isScreenListItem(value: unknown): value is ScreenListItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isNonEmptyString(item.name) &&
    typeof item.path === "string" &&
    typeof item.description === "string" &&
    isStringArray(item.components)
  );
}

/**
 * AI 응답을 DesignPlanContent로 파싱한다. 형태가 조금이라도 어긋나면(필수 필드 누락, 타입 불일치 등)
 * null을 반환해 호출자가 결정론적 기본값으로 폴백하도록 한다 — 절반만 유효한 데이터를 그대로
 * 반환하지 않는다(Website Builder Content Engine과 동일한 all-or-nothing 검증 원칙).
 */
export function parseDesignPlanContent(raw: string): DesignPlanContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  const ra = obj.requirementAnalysis;
  if (typeof ra !== "object" || ra === null) return null;
  const raObj = ra as Record<string, unknown>;

  if (
    !isNonEmptyString(raObj.projectSummary) ||
    !isStringArray(raObj.functionalRequirements) ||
    !isStringArray(raObj.nonFunctionalRequirements) ||
    !isStringArray(raObj.businessRules) ||
    !isStringArray(raObj.targetUsers)
  ) {
    return null;
  }

  if (!Array.isArray(obj.featureList) || !obj.featureList.every(isFeatureItem)) return null;
  if (!Array.isArray(obj.siteMap) || !obj.siteMap.every(isSiteMapNode)) return null;
  if (!Array.isArray(obj.userFlows) || !obj.userFlows.every(isUserFlow)) return null;
  if (!Array.isArray(obj.screenList) || !obj.screenList.every(isScreenListItem)) return null;

  return {
    requirementAnalysis: raObj as unknown as DesignPlanContent["requirementAnalysis"],
    featureList: obj.featureList,
    siteMap: obj.siteMap,
    userFlows: obj.userFlows,
    screenList: obj.screenList,
  };
}

/**
 * 입력만으로 항상 유효한 5종 산출물을 만드는 결정론적 폴백 — Provider 미설정이거나 응답 파싱에
 * 실패해도 Phase 1 화면이 절대 빈 상태가 되지 않도록 한다(Website Builder의 buildDefaultContent()와 동일한 역할).
 */
export function buildDefaultDesignPlan(input: DesignPlanInput): DesignPlanContent {
  const name = input.projectName.trim() || "New Project";

  return {
    requirementAnalysis: {
      projectSummary: `${name}은(는) "${input.projectType || "일반 웹사이트"}" 유형의 프로젝트로, ${
        input.targetUsers || "일반 사용자"
      }를 대상으로 한다.`,
      functionalRequirements: [
        "홈페이지에서 핵심 서비스/상품을 소개한다.",
        "사용자가 문의 또는 신청을 남길 수 있는 폼을 제공한다.",
        "관리자가 콘텐츠를 확인·관리할 수 있어야 한다.",
      ],
      nonFunctionalRequirements: [
        "모바일/태블릿/데스크탑 반응형을 지원한다.",
        "페이지 로딩 성능을 최적화한다.",
        "접근성(키보드 내비게이션, 시맨틱 마크업)을 준수한다.",
      ],
      businessRules: [
        "고객 승인 없이는 콘텐츠를 실제 서비스에 배포하지 않는다.",
        "개인정보는 수집 목적 범위 내에서만 사용한다.",
      ],
      targetUsers: input.targetUsers ? [input.targetUsers] : ["일반 방문자"],
    },
    featureList: [
      { name: "홈페이지", description: "브랜드 소개 및 핵심 메시지 전달", priority: "High" },
      { name: "서비스 소개", description: "제공하는 서비스/상품 상세 설명", priority: "High" },
      { name: "문의하기", description: "고객이 문의를 남길 수 있는 폼", priority: "High" },
      { name: "회사 소개", description: "연혁, 미션, 비전 소개", priority: "Medium" },
    ],
    siteMap: [
      { path: "/", title: "홈" },
      { path: "/about", title: "회사 소개" },
      { path: "/services", title: "서비스" },
      { path: "/contact", title: "문의하기" },
    ],
    userFlows: [
      {
        name: "문의하기 흐름",
        steps: [
          { step: 1, screen: "홈", action: "문의하기 버튼 클릭", next: "문의 폼" },
          { step: 2, screen: "문의 폼", action: "정보 입력 후 제출", next: "완료" },
          { step: 3, screen: "완료", action: "제출 확인 메시지 확인", next: "Complete" },
        ],
      },
    ],
    screenList: [
      { name: "홈", path: "/", description: "메인 랜딩 화면", components: ["Header", "Hero", "Footer"] },
      {
        name: "회사 소개",
        path: "/about",
        description: "회사 연혁 및 비전 소개",
        components: ["Header", "Card", "Footer"],
      },
      {
        name: "서비스",
        path: "/services",
        description: "서비스 목록 및 상세 설명",
        components: ["Header", "Card", "Footer"],
      },
      {
        name: "문의하기",
        path: "/contact",
        description: "문의 폼 및 연락처 정보",
        components: ["Header", "Form", "Footer"],
      },
    ],
  };
}

export interface GenerateDesignPlanResult {
  content: DesignPlanContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn`은 기본값이 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 빠르게 검증한다(packages/cli를 Next.js 앱에서 직접 import하지 않는 기존 원칙 유지).
 */
export async function generateDesignPlan(
  input: DesignPlanInput,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateDesignPlanResult> {
  const result = await chatFn(buildUserPrompt(input), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parseDesignPlanContent(result.content);
    if (parsed) {
      return { content: parsed, simulated: false, provider: result.provider, model: result.model };
    }
  }

  return { content: buildDefaultDesignPlan(input), simulated: true };
}
