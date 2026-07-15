import { createHash } from "crypto";
import type { FigmaRecord } from "./figma";
import { DESIGN_TOKEN_SEED } from "./figma-generator";
import type { WireframeRecord } from "./wireframe";
import type {
  CodeComponentSnapshot,
  CodeSnapshot,
  ConflictEntry,
  DesignSnapshot,
  DesignTokenRef,
  PatchEntry,
  SyncDirection,
  SyncRecord,
  SyncStatus,
} from "./design-sync";

/**
 * Design Automation — Phase 8 Sync Engine. 순수 함수만 담는다(fs 의존성 없음, design-sync.ts가
 * 영속화를 담당) — Wireframe(+Figma Design Token)로부터 Design/Code 스냅샷을 만들고, 이전
 * SyncRecord와 비교해 Patch·Conflict를 계산한다. AI Provider 호출 없음(Phase 6 Review/Approval
 * Engine, Phase 7 Export와 동일하게 이미 확정된 구조화 데이터를 옮기는 순수 변환).
 */

function computeHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/** Figma Export(Phase 7)가 이미 있으면 그 Design Token을 그대로 재사용하고, 없으면 동일한 CNBIZ 팔레트로 폴백한다. */
function resolveTokens(figma: FigmaRecord | null): DesignTokenRef[] {
  if (figma && figma.content.tokens.length > 0) {
    return figma.content.tokens.map((token) => ({ name: token.name, value: token.value }));
  }

  return DESIGN_TOKEN_SEED.map((seed) => ({ name: seed.name, value: seed.value }));
}

export function buildDesignSnapshot(wireframe: WireframeRecord, figma: FigmaRecord | null): DesignSnapshot {
  const screens = wireframe.content.layouts.map((layout) => layout.screen);
  const components = Array.from(new Set(wireframe.content.components.map((spec) => spec.type)));
  const tokens = resolveTokens(figma);
  const hash = computeHash(JSON.stringify({ screens, components, tokens }));

  return { screens, components, tokens, hash };
}

function buildComponentCode(type: string, tokens: DesignTokenRef[]): string {
  const primary = tokens.find((t) => t.name === "Primary")?.value ?? "#005BAC";
  return `export function ${type}() {\n  return <div className="rounded-md border" style={{ borderColor: "${primary}" }}>${type}</div>;\n}`;
}

/** Design → Code 방향의 기본 변환 — Wireframe 컴포넌트 인벤토리 + Design Token으로부터 결정론적으로 코드 스냅샷을 만든다. */
export function buildCodeSnapshot(design: DesignSnapshot): CodeSnapshot {
  const components: CodeComponentSnapshot[] = design.components.map((type) => ({
    name: type,
    file: `components/${type}.tsx`,
    code: buildComponentCode(type, design.tokens),
  }));

  const themeLines = design.tokens.map(
    (token) => `  --${token.name.toLowerCase().replace(/\s+/g, "-")}: ${token.value};`
  );
  const theme = `:root {\n${themeLines.join("\n")}\n}`;

  const hash = computeHash(JSON.stringify({ components, theme }));
  return { components, theme, hash };
}

export interface CodeOverrideInput {
  components?: { name: string; file?: string; code: string }[];
  theme?: string;
}

/**
 * Code → Design 방향에서 "코드 쪽에서 실제로 편집된 내용"을 시뮬레이션하기 위한 입력 —
 * 실제 코드베이스가 이 저장소의 Design 체인과 연결되어 있지 않으므로(DESIGN_AUTOMATION_MASTER.md
 * 10번 참고), 호출자가 codeOverride로 "코드가 이렇게 바뀌었다"를 전달하면 그 값으로 코드
 * 스냅샷을 만든다. 넘기지 않으면 자동 생성된 코드(autoCode)를 그대로 사용해 no-op가 된다.
 */
export function applyCodeOverride(autoCode: CodeSnapshot, override: CodeOverrideInput | null | undefined): CodeSnapshot {
  if (!override) return autoCode;

  const components = autoCode.components.map((component) => {
    const match = override.components?.find((c) => c.name === component.name);
    return match ? { name: component.name, file: match.file ?? component.file, code: match.code } : component;
  });

  for (const extra of override.components ?? []) {
    if (!components.some((c) => c.name === extra.name)) {
      components.push({ name: extra.name, file: extra.file ?? `components/${extra.name}.tsx`, code: extra.code });
    }
  }

  const theme = override.theme ?? autoCode.theme;
  const hash = computeHash(JSON.stringify({ components, theme }));

  return { components, theme, hash };
}

/** 이전 SyncRecord(있다면)와 비교해 화면/컴포넌트/토큰/코드/테마의 추가·삭제·변경을 나열한다. */
export function buildPatch(previous: SyncRecord | null, design: DesignSnapshot, code: CodeSnapshot): PatchEntry[] {
  const patch: PatchEntry[] = [];

  if (!previous) {
    for (const screen of design.screens) patch.push({ type: "added", target: `screen:${screen}`, detail: "초기 동기화" });
    for (const component of design.components)
      patch.push({ type: "added", target: `component:${component}`, detail: "초기 동기화" });
    for (const token of design.tokens)
      patch.push({ type: "added", target: `token:${token.name}`, detail: `값 ${token.value}` });
    for (const component of code.components)
      patch.push({ type: "added", target: `code:${component.name}`, detail: component.file });
    return patch;
  }

  const prevScreens = new Set(previous.designSnapshot.screens);
  const nextScreens = new Set(design.screens);
  for (const screen of design.screens) if (!prevScreens.has(screen)) patch.push({ type: "added", target: `screen:${screen}`, detail: "새 화면" });
  for (const screen of previous.designSnapshot.screens) if (!nextScreens.has(screen)) patch.push({ type: "removed", target: `screen:${screen}`, detail: "화면 삭제" });

  const prevComponents = new Set(previous.designSnapshot.components);
  const nextComponents = new Set(design.components);
  for (const component of design.components)
    if (!prevComponents.has(component)) patch.push({ type: "added", target: `component:${component}`, detail: "새 컴포넌트" });
  for (const component of previous.designSnapshot.components)
    if (!nextComponents.has(component)) patch.push({ type: "removed", target: `component:${component}`, detail: "컴포넌트 삭제" });

  const prevTokenMap = new Map(previous.designSnapshot.tokens.map((t) => [t.name, t.value]));
  for (const token of design.tokens) {
    const prevValue = prevTokenMap.get(token.name);
    if (prevValue === undefined) patch.push({ type: "added", target: `token:${token.name}`, detail: `값 ${token.value}` });
    else if (prevValue !== token.value) patch.push({ type: "changed", target: `token:${token.name}`, detail: `${prevValue} → ${token.value}` });
  }

  const prevCodeMap = new Map(previous.codeSnapshot.components.map((c) => [c.name, c.code]));
  for (const component of code.components) {
    const prevCode = prevCodeMap.get(component.name);
    if (prevCode === undefined) patch.push({ type: "added", target: `code:${component.name}`, detail: component.file });
    else if (prevCode !== component.code) patch.push({ type: "changed", target: `code:${component.name}`, detail: component.file });
  }

  if (previous.codeSnapshot.theme !== code.theme) {
    patch.push({ type: "changed", target: "code:theme", detail: "Theme CSS 변경" });
  }

  return patch;
}

/**
 * 충돌 판정: "코드 쪽 값이 지금 이 Design으로부터 자동 생성될 값(autoCode)과 다르고", "동시에
 * Design 쪽도 이전 동기화 이후로 실제 바뀌었을 때"만 충돌로 본다. Design이 바뀌지 않았다면
 * 코드 변경은 그냥 받아들여지는(코드 → 디자인 반영) 정상적인 갱신이다(DESIGN_SYNC.md 9번 —
 * 우선순위 3 "최신 변경").
 */
export function detectConflicts(
  previous: SyncRecord | null,
  autoCode: CodeSnapshot,
  candidateCode: CodeSnapshot,
  designChanged: boolean
): ConflictEntry[] {
  if (!previous) return [];
  if (autoCode.hash === candidateCode.hash) return [];
  if (!designChanged) return [];

  const conflicts: ConflictEntry[] = [];
  const candidateMap = new Map(candidateCode.components.map((c) => [c.name, c.code]));

  for (const component of autoCode.components) {
    const candidateValue = candidateMap.get(component.name);
    if (candidateValue === undefined || candidateValue !== component.code) {
      conflicts.push({ target: component.name, designValue: component.code, codeValue: candidateValue ?? "(missing)" });
    }
  }

  if (autoCode.theme !== candidateCode.theme) {
    conflicts.push({ target: "theme", designValue: autoCode.theme, codeValue: candidateCode.theme });
  }

  return conflicts;
}

export interface ComputeSyncInput {
  direction: SyncDirection;
  wireframe: WireframeRecord;
  figma: FigmaRecord | null;
  previous: SyncRecord | null;
  codeOverride?: CodeOverrideInput | null;
}

export interface ComputeSyncResult {
  designSnapshot: DesignSnapshot;
  codeSnapshot: CodeSnapshot;
  patch: PatchEntry[];
  conflicts: ConflictEntry[];
  status: SyncStatus;
}

/**
 * Change Detection + Version Compare + Patch Generation + Conflict Detection을 한 번에 계산한다.
 * `direction:"design-to-code"`는 항상 autoCode를 그대로 채택(충돌 불가능). `direction:
 * "code-to-design"`은 `codeOverride`가 주어지면 그 값을 후보로 사용해 위 detectConflicts() 규칙을
 * 적용한다. 결과를 저장할지 말지는 호출자(API route)의 책임 — 이 함수는 순수 계산만 한다(POST
 * .../compare가 이 결과를 그대로 미리보기로 반환하고, POST .../sync는 같은 결과를 저장까지 한다).
 */
export function computeSync(input: ComputeSyncInput): ComputeSyncResult {
  const designSnapshot = buildDesignSnapshot(input.wireframe, input.figma);
  const autoCode = buildCodeSnapshot(designSnapshot);

  const codeSnapshot =
    input.direction === "code-to-design" ? applyCodeOverride(autoCode, input.codeOverride) : autoCode;

  const designChanged = input.previous ? input.previous.designSnapshot.hash !== designSnapshot.hash : true;
  const conflicts = detectConflicts(input.previous, autoCode, codeSnapshot, designChanged);
  const patch = buildPatch(input.previous, designSnapshot, codeSnapshot);
  const status: SyncStatus = conflicts.length > 0 ? "conflict" : "in_sync";

  return { designSnapshot, codeSnapshot, patch, conflicts, status };
}
