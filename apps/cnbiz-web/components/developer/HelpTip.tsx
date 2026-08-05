"use client";

import { useEffect, useRef, useState } from "react";

interface HelpTipProps {
  items: string[];
}

/** PageHeader 옆에 붙는 "?" 도움말 버튼 — 클릭하면 이 화면의 용도·연결 관계를 짧게 보여준다. */
export function HelpTip({ items }: HelpTipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-label="도움말 보기"
        className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-600 text-xs font-semibold text-gray-400 transition-colors hover:border-blue-500 hover:text-blue-400"
      >
        ?
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className="absolute left-0 top-8 z-20 w-80 rounded-lg border border-gray-700 bg-gray-900 p-4 text-sm shadow-xl sm:w-96"
        >
          <ul className="flex flex-col gap-2 text-gray-300">
            {items.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden className="text-blue-400">
                  ·
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
