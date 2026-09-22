"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@cnbiz/utils";

interface ScrollRowProps {
  children: ReactNode;
  /** 실제 스크롤되는 flex 컨테이너에 추가할 클래스(예: 모바일 엣지까지 늘리는 -mx-4 트릭). */
  className?: string;
  /** 바깥 relative 래퍼에 추가할 클래스(예: mt-8 간격). */
  wrapperClassName?: string;
  /**
   * 카드가 사라지는 그라데이션의 시작 색(`from-*`)만 지정한다(`to-transparent`는 고정).
   * 이 컴포넌트를 감싸는 section의 실제 배경색과 일치시켜야 페이드가 자연스럽다 — 기본값
   * `from-background`는 `bg-secondary/30` 섹션에 그대로 쓰면 경계가 살짝 어긋난다.
   */
  fadeFromClassName?: string;
}

/**
 * 좌우로 넘치는 카드 목록을 감싸 스크롤 가능한 영역임을 그라데이션 + 화살표 버튼으로 표시한다.
 * 모바일은 카드가 살짝 잘려 보이는 것만으로도 스크롤 가능함이 드러나지만, 데스크탑(넓은 화면)에서는
 * 아무 단서가 없을 수 있어 화살표 버튼을 추가로 제공한다(터치가 아닌 클릭으로도 이동 가능).
 */
export function ScrollRow({
  children,
  className,
  wrapperClassName,
  fadeFromClassName = "from-background",
}: ScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScrollState = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  const scrollByPage = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: direction * scrollRef.current.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", wrapperClassName)}>
      <div
        ref={scrollRef}
        className={cn(
          "flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {children}
      </div>

      {canScrollLeft && (
        <>
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r to-transparent", fadeFromClassName)}
          />
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label="이전 항목 보기"
            className="absolute left-1 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-secondary bg-background p-2 text-foreground shadow-md transition-shadow hover:shadow-lg sm:flex"
          >
            <ChevronIcon direction="left" />
          </button>
        </>
      )}

      {canScrollRight && (
        <>
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent", fadeFromClassName)}
          />
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label="다음 항목 보기"
            className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-secondary bg-background p-2 text-foreground shadow-md transition-shadow hover:shadow-lg sm:flex"
          >
            <ChevronIcon direction="right" />
          </button>
        </>
      )}
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg className="h-4 w-4" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  );
}
