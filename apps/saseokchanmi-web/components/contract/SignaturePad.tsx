"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trimAndExport } from "@/lib/contract/client/image";

interface Props {
  /** 서명이 바뀔 때마다 투명 PNG data URL을 돌려준다. 지우면 빈 문자열. */
  onChange: (dataUrl: string) => void;
  /** 바깥에서 값을 비웠을 때(저장 후 초기화 등) 캔버스도 함께 비우기 위한 키. */
  resetKey?: number;
  height?: number;
  label?: string;
}

/** 손가락·마우스로 서명하는 캔버스. 결과는 배경이 투명한 PNG로 잘라서 돌려준다. */
export function SignaturePad({ onChange, resetKey = 0, height = 160, label = "서명" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  const clear = useCallback(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  }, []);

  // 화면 크기에 맞춰 캔버스 해상도를 맞춘다(고해상도 화면에서도 선이 또렷하게).
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(c.clientWidth * ratio);
    c.height = Math.round(height * ratio);
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2.6 * ratio;
    }
    setEmpty(true);
  }, [height, resetKey]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = ref.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#111";
    ctx.fill();
    setEmpty(false);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const p = point(e);
    const ctx = ref.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (ref.current) onChange(trimAndExport(ref.current));
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        aria-label={`${label}을 손가락이나 마우스로 그려 주세요`}
        className="block w-full touch-none rounded-lg border border-dashed border-primary/50 bg-white"
        style={{ height }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{empty ? `위 칸에 ${label}을 그려 주세요.` : `${label}이 입력되었습니다.`}</span>
        <button
          type="button"
          onClick={() => {
            clear();
            onChange("");
          }}
          className="rounded-md border border-secondary px-3 py-1.5 font-semibold text-primary hover:bg-secondary/40"
        >
          지우고 다시
        </button>
      </div>
    </div>
  );
}
