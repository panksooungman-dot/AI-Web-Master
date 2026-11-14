import type { ReactNode } from "react";

/** 관리자 화면 공통 조각. 입력창·버튼·상태 배지의 모양을 한곳에서 맞춘다. */

export const inputCls =
  "block w-full rounded-lg border border-secondary bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-secondary/30";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50";
export const btnOutline =
  "inline-flex items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-secondary/40 disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center justify-center rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50";

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Panel({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-xl border border-secondary bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const TONES = {
  neutral: "bg-secondary/60 text-foreground",
  warn: "bg-amber-100 text-amber-900",
  ok: "bg-emerald-100 text-emerald-900",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

export function Notice({ tone, children }: { tone: "error" | "ok" | "info"; children: ReactNode }) {
  const cls = tone === "error" ? "border-red-200 bg-red-50 text-red-800" : tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-secondary bg-secondary/30 text-foreground";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${cls}`}>
      {children}
    </div>
  );
}

/** 상태 → 배지 색. 서버의 ContractStatus 값과 같다. */
export const statusTone = (s: string): keyof typeof TONES => (s === "confirmed" ? "ok" : s === "awaiting_owner" ? "warn" : "neutral");
