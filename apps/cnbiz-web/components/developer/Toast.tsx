"use client";

import { useEffect } from "react";
import { componentMarker } from "@/lib/dev/component-marker";

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  error: "bg-red-500/10 text-red-400 border-red-500/30",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

/** Badge/StatusMessage와 동일한 dark-tone 팔레트를 재사용하는 최소 Toast — 기존 프로젝트에
 * Toast가 아직 없어 신규 추가하되, 전역 Provider 없이 페이지 로컬 state로 조합해 쓰도록
 * 얇게 유지한다(재사용이 필요해지는 두 번째 화면이 생기면 그때 훅으로 승격). */
export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      {...componentMarker("ToastStack", "components/developer/Toast.tsx")}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      className={`min-w-[240px] max-w-sm rounded-lg border px-4 py-3 text-sm font-semibold shadow-xl ${TONE_STYLES[toast.tone]}`}
    >
      {toast.text}
    </div>
  );
}
