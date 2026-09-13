"use client";

import { useRef } from "react";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
}

/**
 * 마우스/터치로 그리는 전자서명 캔버스 — 공인전자서명이 아닌 이미지 기반 서명이다(법적 효력
 * 판단은 사용자 책임). `canvas.width`/`height`(실제 드로잉 해상도)와 CSS 표시 크기가
 * `w-full`로 인해 좁은 화면에서 달라질 수 있어, 포인터 좌표를 항상 `rect` 대비 스케일
 * 보정한다 — 보정하지 않으면 모바일처럼 캔버스가 축소 표시될 때 선이 실제 터치 위치와
 * 어긋난다.
 */
export function SignaturePad({ onChange, width = 500, height = 180 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  function getPos(canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const { x, y } = getPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getPos(canvas, e);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawnRef.current = true;
  }

  function handlePointerUp() {
    isDrawingRef.current = false;
    if (hasDrawnRef.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full touch-none rounded border border-slate-300 bg-white"
        style={{ maxWidth: width, height }}
        aria-label="서명란 — 마우스나 손가락으로 서명을 그려주세요"
      />
      <button
        type="button"
        onClick={handleClear}
        className="self-start text-xs text-slate-500 underline hover:text-slate-700"
      >
        지우기
      </button>
    </div>
  );
}
