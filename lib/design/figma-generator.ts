import type {
  FigmaAsset,
  FigmaComponentSpec,
  FigmaContent,
  FigmaFrame,
  FigmaPage,
  FigmaToken,
} from "./figma";
import type { ClaudeDesignRecord } from "./claude-design";
import type { PrototypeRecord } from "./prototype";
import type { Breakpoint, WireframeRecord } from "./wireframe";

/**
 * Design Automation — Phase 7 Figma Engine. Import는 실제 Figma REST API(`FIGMA_API_TOKEN`
 * 설정 시)를 호출하고, Export는 Phase 3~5(Wireframe/Prototype/Claude Design) 산출물을 Figma
 * 구조(Pages/Frames/Components/Design Tokens/Assets)로 결정론적으로 변환한다 — Figma REST API는
 * 공개적으로 임의의 Page/Frame/Component를 생성하는 쓰기 엔드포인트를 제공하지 않으므로(Variables만
 * Enterprise 플랜에 한해 쓰기 가능), Export의 "실제 반영"은 Design Token(Variables)에 한해서만
 * 시도한다. 이 제약은 Figma REST API 자체의 한계이며 문서(DESIGN_AUTOMATION_MASTER.md 9번)에
 * 기록한다.
 */

const FIGMA_API_BASE = "https://api.figma.com/v1";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Provider(Figma API) 미설정/실패 시 폴백 — figmaFileId만으로 항상 유효한 콘텐츠를 만든다. */
export function buildDefaultFigmaImportContent(figmaFileId: string): FigmaContent {
  const page: FigmaPage = { id: createId("page"), name: "Page 1", frameCount: 1 };

  return {
    pages: [page],
    frames: [
      { id: createId("frame"), name: "Home", page: page.name, breakpoint: "desktop", width: 1440, height: 1024 },
    ],
    components: [{ id: createId("component"), name: "Button", type: "Button", usedIn: ["Home"] }],
    tokens: [{ id: createId("token"), name: "Primary", category: "color", value: "#005BAC" }],
    assets: [{ id: createId("asset"), name: `${figmaFileId}-logo`, type: "logo" }],
  };
}

/**
 * `GET /v1/files/:file_key` 응답을 방어적으로 파싱한다 — 형태가 조금이라도 어긋나면(document
 * 없음, children이 배열이 아님 등) null을 반환해 호출자가 결정론적 기본값으로 폴백하도록 한다
 * (Phase 1~6의 all-or-nothing 파싱 원칙과 동일).
 */
function parseFigmaFileResponse(json: unknown): FigmaContent | null {
  if (!isRecord(json)) return null;

  const document = json.document;
  if (!isRecord(document) || !Array.isArray(document.children)) return null;

  const pages: FigmaPage[] = [];
  const frames: FigmaFrame[] = [];

  for (const canvas of document.children) {
    if (!isRecord(canvas) || typeof canvas.name !== "string") continue;

    const canvasChildren = Array.isArray(canvas.children) ? canvas.children : [];
    const frameNodes = canvasChildren.filter(
      (node): node is Record<string, unknown> => isRecord(node) && node.type === "FRAME"
    );

    pages.push({
      id: typeof canvas.id === "string" ? canvas.id : createId("page"),
      name: canvas.name,
      frameCount: frameNodes.length,
    });

    for (const frameNode of frameNodes) {
      const box = isRecord(frameNode.absoluteBoundingBox) ? frameNode.absoluteBoundingBox : {};
      frames.push({
        id: typeof frameNode.id === "string" ? frameNode.id : createId("frame"),
        name: typeof frameNode.name === "string" ? frameNode.name : "Frame",
        page: canvas.name,
        breakpoint: "desktop",
        width: typeof box.width === "number" ? Math.round(box.width) : 0,
        height: typeof box.height === "number" ? Math.round(box.height) : 0,
      });
    }
  }

  if (pages.length === 0) return null;

  const componentsRaw = isRecord(json.components) ? json.components : {};
  const components: FigmaComponentSpec[] = Object.entries(componentsRaw).map(([id, value]) => ({
    id,
    name: isRecord(value) && typeof value.name === "string" ? value.name : id,
    type: "Component",
    usedIn: [],
  }));

  return { pages, frames, components, tokens: [], assets: [] };
}

export interface FigmaImportInput {
  figmaFileId: string;
  fileName?: string;
}

export interface FigmaImportResult {
  content: FigmaContent;
  fileName: string;
  simulated: boolean;
}

/**
 * `FIGMA_API_TOKEN`이 설정되어 있으면 실제 Figma REST API(`GET /v1/files/:file_key`)를 호출해
 * Pages/Frames/Components를 가져온다. 토큰이 없거나 호출/파싱이 실패하면
 * `buildDefaultFigmaImportContent()`로 폴백한다(Website Builder Content Engine과 동일한
 * resolve → parse → fallback 원칙).
 */
export async function importFigmaFile(
  input: FigmaImportInput,
  fetchFn: FetchLike = fetch
): Promise<FigmaImportResult> {
  const token = process.env.FIGMA_API_TOKEN;

  if (token) {
    try {
      const res = await fetchFn(`${FIGMA_API_BASE}/files/${input.figmaFileId}`, {
        headers: { "X-Figma-Token": token },
      });

      if (res.ok) {
        const json: unknown = await res.json();
        const content = parseFigmaFileResponse(json);

        if (content) {
          const fileName =
            input.fileName ?? (isRecord(json) && typeof json.name === "string" ? json.name : `Figma File ${input.figmaFileId}`);
          return { content, fileName, simulated: false };
        }
      }
    } catch {
      // fetch/parse 실패 — 아래 결정론적 폴백으로 넘어간다.
    }
  }

  return {
    content: buildDefaultFigmaImportContent(input.figmaFileId),
    fileName: input.fileName ?? `Figma File ${input.figmaFileId}`,
    simulated: true,
  };
}

const BREAKPOINT_DIMENSIONS: Record<Breakpoint, { width: number; height: number }> = {
  desktop: { width: 1440, height: 1024 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

const BREAKPOINTS: Breakpoint[] = ["desktop", "tablet", "mobile"];

/** DESIGN_SYSTEM.md/CNBIZ_RULES.md의 표준 팔레트·간격·radius를 그대로 반영한 Design Token 시드. */
const DESIGN_TOKEN_SEED: { name: string; category: FigmaToken["category"]; value: string }[] = [
  { name: "Primary", category: "color", value: "#005BAC" },
  { name: "Secondary", category: "color", value: "#1F2937" },
  { name: "Success", category: "color", value: "#10B981" },
  { name: "Warning", category: "color", value: "#F59E0B" },
  { name: "Danger", category: "color", value: "#EF4444" },
  { name: "Info", category: "color", value: "#0EA5E9" },
  { name: "Neutral", category: "color", value: "#6B7280" },
  { name: "Spacing Unit", category: "spacing", value: "8px" },
  { name: "Radius Medium", category: "radius", value: "8px" },
];

export interface FigmaExportChain {
  wireframe: WireframeRecord;
  prototype: PrototypeRecord;
  claudeDesign: ClaudeDesignRecord;
}

/**
 * Phase 3(Wireframe) 화면 구성을 Figma Pages/Frames로, Phase 3 컴포넌트 인벤토리를 Figma
 * Components로, 표준 디자인 시스템 팔레트를 Design Tokens로 변환한다 — AI 호출 없는 순수 변환
 * (Phase 6 Review/Approval Engine과 동일하게, 이미 확정된 구조화 데이터를 다른 형태로 옮기는
 * 단계라 별도 AI 생성이 필요하지 않다고 판단).
 */
export function buildFigmaExportContent(chain: FigmaExportChain): FigmaContent {
  const pages: FigmaPage[] = chain.wireframe.content.layouts.map((layout) => ({
    id: createId("page"),
    name: layout.screen,
    frameCount: BREAKPOINTS.length,
  }));

  const frames: FigmaFrame[] = chain.wireframe.content.layouts.flatMap((layout) =>
    BREAKPOINTS.map((breakpoint) => ({
      id: createId("frame"),
      name: `${layout.screen} — ${breakpoint}`,
      page: layout.screen,
      breakpoint,
      width: BREAKPOINT_DIMENSIONS[breakpoint].width,
      height: BREAKPOINT_DIMENSIONS[breakpoint].height,
    }))
  );

  const components: FigmaComponentSpec[] = chain.wireframe.content.components.map((spec) => ({
    id: createId("component"),
    name: spec.type,
    type: spec.type,
    usedIn: [...spec.usedIn],
  }));

  const tokens: FigmaToken[] = DESIGN_TOKEN_SEED.map((seed) => ({ id: createId("token"), ...seed }));

  const assets: FigmaAsset[] = [
    { id: createId("asset"), name: "logo", type: "logo" },
    { id: createId("asset"), name: "favicon", type: "icon" },
  ];

  return { pages, frames, components, tokens, assets };
}

export interface FigmaExportInput extends FigmaExportChain {
  figmaFileId: string;
}

export interface FigmaExportResult {
  content: FigmaContent;
  simulated: boolean;
}

/**
 * Export 콘텐츠는 항상 로컬에서 결정론적으로 만들어진다(위 buildFigmaExportContent()). 추가로
 * `FIGMA_API_TOKEN`이 설정되어 있으면 Figma REST API의 Variables 쓰기 엔드포인트(Enterprise 전용)로
 * Design Token 반영을 시도한다 — 성공하면 simulated:false, 실패(토큰 없음/API 오류/Enterprise
 * 아님 등)하면 simulated:true로 표시하되 콘텐츠 자체는 항상 동일하게 반환한다(Export 결과가
 * Provider 상태에 따라 비어버리는 일이 없도록).
 */
export async function exportFigmaFile(
  input: FigmaExportInput,
  fetchFn: FetchLike = fetch
): Promise<FigmaExportResult> {
  const content = buildFigmaExportContent(input);
  const token = process.env.FIGMA_API_TOKEN;

  if (!token) {
    return { content, simulated: true };
  }

  try {
    const res = await fetchFn(`${FIGMA_API_BASE}/files/${input.figmaFileId}/variables`, {
      method: "POST",
      headers: { "X-Figma-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({
        variables: content.tokens.map((token) => ({ action: "CREATE", name: token.name })),
      }),
    });

    if (!res.ok) throw new Error(`Figma API ${res.status}`);
    return { content, simulated: false };
  } catch {
    return { content, simulated: true };
  }
}
