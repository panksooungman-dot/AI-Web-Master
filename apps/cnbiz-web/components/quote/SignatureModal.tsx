"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * 전자서명 입력을 중앙 팝업으로 띄운다. `packages/layout-primitives`의 MobileDrawer와 동일한
 * 이유로 document.body에 포탈링한다 — 헤더의 backdrop-blur(backdrop-filter)가 fixed 자손의
 * containing block이 되어 뷰포트 전체가 아닌 헤더 박스 크기로 갇히는 것을 방지한다.
 */
export function SignatureModal({ open, onClose, title, children }: SignatureModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="text-xl leading-none text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
