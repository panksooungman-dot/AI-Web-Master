"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

interface FlowNode {
  screen: string;
  path: string;
}

interface FlowEdge {
  from: string;
  to: string;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Storyboard(Screen Flow·Navigation Flow, 둘 다 텍스트 목록)를 화면 박스 + 화살표로 시각화한
 * 간단한 흐름도. AI가 생성하는 임의의 그래프(하나의 화면이 여러 화면에서 참조될 수 있음, 트리가
 * 아님)를 다뤄야 해서, 각 화면의 레벨을 "루트(진입 화면)로부터의 최장 경로 길이"로 계산해
 * 위에서 아래로 층을 나눈다(Sugiyama 스타일 레이어링의 단순화 버전) — 같은 레벨 안에서는 순서를
 * 보장하지 않고 원본 배열 순서를 그대로 유지한다.
 *
 * 정확한 좌표 계산 없이 CSS만으로는 "이 화살표가 정확히 이 박스에서 저 박스로 간다"는 것을 보여줄
 * 수 없어, 실제 DOM에 렌더링된 박스 위치를 측정해(`getBoundingClientRect`) SVG로 그 사이를 잇는
 * 곡선을 그린다. 레이어링이 화살표의 방향을 항상 "아래로" 보장하므로(level[to] > level[from]),
 * 시작점은 항상 박스 하단 중앙, 끝점은 항상 박스 상단 중앙을 쓴다 — 다만 실제로 생성된 데이터에
 * 순환이 섞여 있는 예외 상황까지 대비해, 그 보장이 깨진 화살표(끝점이 시작점보다 위)는 그리지
 * 않고 조용히 건너뛴다.
 */
export function ScreenFlowDiagram({ screens, edges }: { screens: FlowNode[]; edges: FlowEdge[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const [rects, setRects] = useState<Record<string, Rect>>({});

  const levels = useMemo(() => computeLevels(screens, edges), [screens, edges]);

  const validEdges = useMemo(() => {
    const known = new Set(screens.map((s) => s.screen));
    return edges.filter((e) => known.has(e.from) && known.has(e.to) && e.from !== e.to);
  }, [screens, edges]);

  useLayoutEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const next: Record<string, Rect> = {};
      for (const [screen, el] of nodeRefs.current) {
        const r = el.getBoundingClientRect();
        next[screen] = { x: r.left - containerRect.left, y: r.top - containerRect.top, width: r.width, height: r.height };
      }
      setRects(next);
    }

    measure();

    // 각 레벨(행)을 justify-center로 독립적으로 가운데 정렬하다 보니, 레벨 0(진입 화면)처럼
    // 노드가 적은 행은 가장 넓은 행 기준 전체 너비의 시각적 "가운데"쯤에 위치하게 된다.
    // 다이어그램이 뷰포트보다 넓어져 가로 스크롤이 생기면, 브라우저 기본 스크롤 위치
    // (scrollLeft=0, 맨 왼쪽)로는 그 가운데에 있는 진입 화면이 초기 화면 밖으로 벗어나 보이지
    // 않는 문제가 실사용에서 확인됐다(2026-09-14 — "이 그림이야" 스크린샷에서 HOME 박스가
    // 안 보이고 화살표만 화면 밖에서 들어오는 것으로 재현). 다이어그램이 새로 그려질 때(마운트,
    // 또는 다른 Storyboard 선택으로 levels가 바뀔 때)만 가로 스크롤을 가운데로 맞춘다 — 이후
    // 창 크기 변경(resize) 시에는 사용자가 이미 스크롤해 둔 위치를 그대로 존중한다.
    const container = containerRef.current;
    if (container) {
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [levels]);

  if (screens.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-6">
      <div ref={containerRef} className="relative flex min-w-max flex-col items-stretch gap-10">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <marker id="screen-flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#60a5fa" />
            </marker>
          </defs>
          {validEdges.map((edge, i) => {
            const from = rects[edge.from];
            const to = rects[edge.to];
            if (!from || !to) return null;
            const startX = from.x + from.width / 2;
            const startY = from.y + from.height;
            const endX = to.x + to.width / 2;
            const endY = to.y;
            if (endY <= startY) return null;
            const midY = (startY + endY) / 2;
            return (
              <path
                key={`${edge.from}->${edge.to}-${i}`}
                d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                fill="none"
                stroke="#93c5fd"
                strokeWidth={1.5}
                markerEnd="url(#screen-flow-arrow)"
              />
            );
          })}
        </svg>

        {levels.map((levelScreens, levelIndex) => (
          <div key={levelIndex} className="relative z-10 flex flex-wrap justify-center gap-4">
            {levelScreens.map((node) => (
              <div
                key={node.screen}
                ref={(el) => {
                  if (el) nodeRefs.current.set(node.screen, el);
                  else nodeRefs.current.delete(node.screen);
                }}
                className="min-w-[140px] max-w-[220px] rounded-lg border border-primary/30 bg-white px-4 py-2.5 text-center shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">{node.screen}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-slate-400">{node.path}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function computeLevels(screens: FlowNode[], edges: FlowEdge[]): FlowNode[][] {
  const byScreen = new Map(screens.map((s) => [s.screen, s]));
  const validEdges = edges.filter((e) => byScreen.has(e.from) && byScreen.has(e.to) && e.from !== e.to);

  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const level = new Map<string, number>();
  for (const s of screens) {
    inDegree.set(s.screen, 0);
    outgoing.set(s.screen, []);
    level.set(s.screen, 0);
  }
  for (const e of validEdges) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    outgoing.get(e.from)?.push(e.to);
  }

  // Kahn's algorithm으로 위상 정렬 순서대로 처리하며 level[to] = max(level[to], level[from]+1)를
  // 누적해 "루트로부터의 최장 경로"를 구한다(레이어링). 순환이 있으면 일부 노드의 in-degree가
  // 0에 도달하지 못해 큐가 먼저 비므로, 남은 노드는 무한 루프 없이 마지막 레벨 다음에 몰아 배치한다.
  const remaining = new Map(inDegree);
  const queue: string[] = screens.filter((s) => (remaining.get(s.screen) ?? 0) === 0).map((s) => s.screen);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of outgoing.get(current) ?? []) {
      level.set(next, Math.max(level.get(next) ?? 0, (level.get(current) ?? 0) + 1));
      const left = (remaining.get(next) ?? 0) - 1;
      remaining.set(next, left);
      if (left <= 0 && !visited.has(next)) queue.push(next);
    }
  }

  const maxVisitedLevel = Math.max(0, ...Array.from(visited, (s) => level.get(s) ?? 0));
  for (const s of screens) {
    if (!visited.has(s.screen)) level.set(s.screen, maxVisitedLevel + 1);
  }

  const grouped = new Map<number, FlowNode[]>();
  for (const s of screens) {
    const lv = level.get(s.screen) ?? 0;
    if (!grouped.has(lv)) grouped.set(lv, []);
    grouped.get(lv)!.push(byScreen.get(s.screen)!);
  }

  return Array.from(grouped.keys())
    .sort((a, b) => a - b)
    .map((lv) => grouped.get(lv)!);
}
