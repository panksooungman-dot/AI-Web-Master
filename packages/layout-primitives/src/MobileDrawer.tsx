"use client";

import type { ReactNode } from "react";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}

export function MobileDrawer({ open, onClose, children, label }: MobileDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}
