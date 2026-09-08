"use client";

import { useState } from "react";
import { Badge } from "@/components/developer/Badge";
import { componentMarker } from "@/lib/dev/component-marker";
import type {
  Breakpoint,
  BreakpointLayout,
  ComponentType,
  ScreenLayout,
  WireframeSection,
} from "@/lib/design/wireframe";

/**
 * `lib/design/wireframe.ts`는 서버 전용 registry(내부적으로 `lib/db` → `fs`를 사용)라 이
 * 클라이언트 컴포넌트에서는 타입만 가져온다(`import type` — 런타임에 완전히 지워져 번들에
 * 포함되지 않는다). `COMPONENT_TYPES`는 값이라 그렇게 가져올 수 없어, 같은 13종 팔레트를
 * 여기 그대로 복제해 둔다 — `lib/design/wireframe.ts`의 `COMPONENT_TYPES`와 항상 같은 값을
 * 유지해야 한다(Wireframe Generator의 SYSTEM_PROMPT가 참조하는 고정 팔레트).
 */
const WIREFRAME_COMPONENT_TYPES: ComponentType[] = [
  "Header",
  "Navigation",
  "Sidebar",
  "Hero",
  "Card",
  "Form",
  "Table",
  "Dashboard",
  "Footer",
  "Modal",
  "Button",
  "Search",
  "Pagination",
];

/**
 * Wireframe Board — JSON 표 대신 실제 화면처럼 보이는 박스 레이아웃으로 보여주고, 그 자리에서
 * 섹션 순서 변경·추가·삭제·컴포넌트 구성 수정까지 할 수 있게 한다(2026-09-08, "레이아웃 디자인
 * 편집" 요청 반영). 드래그앤드롭 캔버스는 아니다 — 좌표를 자유롭게 옮기는 게 아니라, Phase 3
 * Wireframe이 이미 갖고 있는 "섹션 목록 + 순서 + 구성 컴포넌트"라는 데이터를 화면처럼 시각화해
 * 보여주고 그 데이터를 편집하는 것이다. 편집 결과(`content.layouts`)는 Prototype·Figma
 * Export·Design Sync가 그대로 다시 읽으므로, 여기서 고친 내용이 이후 Phase에 실제로 반영된다.
 */

const BREAKPOINTS: Breakpoint[] = ["desktop", "tablet", "mobile"];

const BREAKPOINT_LABEL: Record<Breakpoint, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

/** 컴포넌트 조합으로 블록 높이를 대략 추정한다 — 실제 좌표가 없는 스펙 데이터를 화면처럼
 *  보이게 하기 위한 시각적 힌트일 뿐, 픽셀 단위 정확도를 갖는 값이 아니다. */
const HEIGHT_HINT: Partial<Record<ComponentType, string>> = {
  Hero: "min-h-28",
  Dashboard: "min-h-28",
  Table: "min-h-24",
  Card: "min-h-20",
  Form: "min-h-20",
  Modal: "min-h-20",
  Sidebar: "min-h-20",
};

function blockHeightClass(components: ComponentType[]): string {
  for (const type of components) {
    if (HEIGHT_HINT[type]) return HEIGHT_HINT[type]!;
  }
  return "min-h-12";
}

function emptySection(): WireframeSection {
  return { name: "새 섹션", components: [], description: "" };
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface SectionBlockProps {
  section: WireframeSection;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChange: (next: WireframeSection) => void;
}

function SectionBlock({ section, isFirst, isLast, onMoveUp, onMoveDown, onRemove, onChange }: SectionBlockProps) {
  const [isEditing, setIsEditing] = useState(false);

  const toggleComponent = (type: ComponentType) => {
    const has = section.components.includes(type);
    onChange({
      ...section,
      components: has ? section.components.filter((c) => c !== type) : [...section.components, type],
    });
  };

  return (
    <div className={`rounded border border-gray-700 bg-gray-800/60 p-2 flex flex-col gap-1.5 ${blockHeightClass(section.components)}`}>
      <div className="flex items-start justify-between gap-2">
        {isEditing ? (
          <input
            value={section.name}
            onChange={(e) => onChange({ ...section, name: e.target.value })}
            className="flex-1 rounded bg-gray-900 border border-gray-700 px-2 py-1 text-xs font-semibold outline-none focus:border-blue-500"
          />
        ) : (
          <p className="text-xs font-semibold text-gray-200">{section.name}</p>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            title="위로 이동"
            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 text-xs px-1"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            title="아래로 이동"
            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 text-xs px-1"
          >
            ▼
          </button>
          <button
            onClick={() => setIsEditing((v) => !v)}
            title="편집"
            className={`text-xs px-1 ${isEditing ? "text-blue-400" : "text-gray-400 hover:text-white"}`}
          >
            ✎
          </button>
          <button onClick={onRemove} title="삭제" className="text-gray-400 hover:text-red-400 text-xs px-1">
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {section.components.length === 0 ? (
          <span className="text-[11px] text-gray-600">컴포넌트 없음</span>
        ) : (
          section.components.map((c) => (
            <Badge key={c} tone="accent" className={isEditing ? "cursor-pointer" : undefined}>
              <span onClick={isEditing ? () => toggleComponent(c) : undefined}>
                {c}
                {isEditing ? " ✕" : ""}
              </span>
            </Badge>
          ))
        )}
      </div>

      {isEditing && (
        <div className="flex flex-col gap-1.5 border-t border-gray-700 pt-1.5 mt-0.5">
          <div className="flex flex-wrap gap-1">
            {WIREFRAME_COMPONENT_TYPES.filter((t) => !section.components.includes(t)).map((t) => (
              <button
                key={t}
                onClick={() => toggleComponent(t)}
                className="text-[11px] rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 px-1.5 py-0.5"
              >
                + {t}
              </button>
            ))}
          </div>
          <textarea
            value={section.description}
            onChange={(e) => onChange({ ...section, description: e.target.value })}
            placeholder="설명"
            rows={2}
            className="w-full rounded bg-gray-900 border border-gray-700 px-2 py-1 text-[11px] outline-none focus:border-blue-500"
          />
        </div>
      )}

      {!isEditing && section.description && <p className="text-[11px] text-gray-500">{section.description}</p>}
    </div>
  );
}

interface BreakpointBoardProps {
  layout: BreakpointLayout;
  onChange: (next: BreakpointLayout) => void;
}

function BreakpointBoard({ layout, onChange }: BreakpointBoardProps) {
  const setSections = (sections: WireframeSection[]) => onChange({ ...layout, sections });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-gray-500">컬럼 수</label>
        <input
          type="number"
          min={1}
          max={12}
          value={layout.columns}
          onChange={(e) => onChange({ ...layout, columns: Math.max(1, Number(e.target.value) || 1) })}
          className="w-14 rounded bg-gray-900 border border-gray-700 px-2 py-1 text-xs outline-none focus:border-blue-500"
        />
      </div>

      <div className="rounded-lg border border-dashed border-gray-700 bg-gray-950 p-2 flex flex-col gap-1.5">
        {layout.sections.map((section, i) => (
          <SectionBlock
            key={i}
            section={section}
            isFirst={i === 0}
            isLast={i === layout.sections.length - 1}
            onMoveUp={() => setSections(moveItem(layout.sections, i, i - 1))}
            onMoveDown={() => setSections(moveItem(layout.sections, i, i + 1))}
            onRemove={() => setSections(layout.sections.filter((_, j) => j !== i))}
            onChange={(next) => setSections(layout.sections.map((s, j) => (j === i ? next : s)))}
          />
        ))}

        <button
          onClick={() => setSections([...layout.sections, emptySection()])}
          className="rounded border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 text-xs py-1.5"
        >
          + 섹션 추가
        </button>
      </div>
    </div>
  );
}

interface WireframeBoardViewProps {
  layout: ScreenLayout;
  onChange: (next: ScreenLayout) => void;
}

export function WireframeBoardView({ layout, onChange }: WireframeBoardViewProps) {
  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>("desktop");

  return (
    <div
      className="flex flex-col gap-2"
      {...componentMarker("WireframeBoardView", "components/developer/design/WireframeBoardView.tsx", "Wireframe 시각 편집 보드")}
    >
      <div className="flex gap-1">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp}
            onClick={() => setActiveBreakpoint(bp)}
            className={`text-xs px-3 py-1 rounded-t border-b-2 ${
              activeBreakpoint === bp
                ? "border-blue-500 text-white bg-gray-800"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {BREAKPOINT_LABEL[bp]}
          </button>
        ))}
      </div>

      <BreakpointBoard layout={layout[activeBreakpoint]} onChange={(next) => onChange({ ...layout, [activeBreakpoint]: next })} />
    </div>
  );
}
