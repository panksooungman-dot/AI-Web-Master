"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtClockTime } from "@/lib/contract/client/clock-format";
import { publicApi } from "@/lib/contract/client/api";

type Employee = { id: string; name: string; status: "in" | "out"; /** 전 근무의 퇴근 기록이 없다(깜빡함) */ stale?: boolean };
type Phase = { kind: "loading" } | { kind: "nodevice" } | { kind: "blocked"; emp: Employee } | { kind: "error"; message: string } | { kind: "list" } | { kind: "pin"; emp: Employee } | { kind: "done"; name: string; punch: "in" | "out"; at: string };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "지움", "0", "확인"] as const;
const btn = "flex min-h-16 items-center justify-center rounded-xl border border-secondary bg-white text-2xl font-semibold text-foreground transition active:bg-secondary/60 disabled:opacity-40";

/** 매장 공용 출퇴근 화면: 이름을 고르고 PIN 4자리를 누르면 출근 또는 퇴근이 기록된다. */
export function ClockScreen() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [digits, setDigits] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await publicApi<{ employees: Employee[] }>("/api/clock/roster");
    if (r.ok) {
      setEmployees(r.employees);
      setPhase((p) => (p.kind === "loading" || p.kind === "error" || p.kind === "nodevice" ? { kind: "list" } : p));
    } else if (r.status === 403) setPhase({ kind: "nodevice" });
    else setPhase((p) => (p.kind === "list" || p.kind === "pin" || p.kind === "done" ? p : { kind: "error", message: r.error }));
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
    const refresh = setInterval(() => void load(), 60_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    queueMicrotask(() => setNow(Date.now()));
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [load]);

  // 기록이 끝나면 몇 초 뒤 자동으로 목록으로 돌아가서, 다음 사람이 바로 쓸 수 있게 한다.
  useEffect(() => {
    if (phase.kind !== "done") return;
    const t = setTimeout(() => setPhase({ kind: "list" }), 6000);
    return () => clearTimeout(t);
  }, [phase]);

  function choose(emp: Employee) {
    // 퇴근 기록이 빠진 직원은 PIN을 받지 않고 안내한다(퇴근 없이 다시 출근하는 것을 막는다).
    if (emp.stale) return setPhase({ kind: "blocked", emp });
    setDigits("");
    setMessage("");
    setPhase({ kind: "pin", emp });
  }

  async function submit(emp: Employee, pin: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const punch = emp.status === "in" ? "out" : "in";
    const r = await publicApi<{ kind: "in" | "out"; at: string; name: string }>("/api/clock/punch", { method: "POST", body: { id: emp.id, pin, kind: punch } });
    setBusy(false);
    if (r.ok) {
      setDigits("");
      setPhase({ kind: "done", name: r.name, punch: r.kind, at: r.at });
      void load();
      return;
    }
    setDigits("");
    if (r.status === 403) return setPhase({ kind: "nodevice" });
    setMessage(r.error);
    if (r.status === 409) void load();
  }

  function press(key: (typeof KEYS)[number], emp: Employee) {
    if (key === "지움") return setDigits((d) => d.slice(0, -1));
    if (key === "확인") return digits.length === 4 ? void submit(emp, digits) : setMessage("PIN 4자리를 눌러 주세요.");
    if (digits.length >= 4) return;
    const next = digits + key;
    setDigits(next);
    setMessage("");
    if (next.length === 4) void submit(emp, next);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 border-b border-secondary pb-4">
        <div>
          <p className="text-sm font-semibold text-muted">사색찬미한정식</p>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">출퇴근</h1>
        </div>
        <p className="text-right text-2xl font-bold tabular-nums text-primary sm:text-3xl" aria-label="현재 시각">
          {now ? fmtClockTime(now) : " "}
        </p>
      </header>

      {phase.kind === "loading" ? <p className="py-12 text-center text-muted">불러오는 중입니다...</p> : null}

      {phase.kind === "nodevice" ? (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
          <p className="text-lg font-bold">등록되지 않은 기기입니다.</p>
          <p className="mt-2 text-sm leading-relaxed">출퇴근은 매장에 등록된 기기에서만 할 수 있습니다. 사장님이 관리자 화면의 &lsquo;출퇴근&rsquo; 메뉴에서 이 기기를 등록해 주셔야 합니다.</p>
        </div>
      ) : null}

      {phase.kind === "error" ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="font-bold">{phase.message}</p>
          <button type="button" onClick={() => void load()} className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold">
            다시 시도
          </button>
        </div>
      ) : null}

      {phase.kind === "list" ? (
        employees.length === 0 ? (
          <p className="py-12 text-center text-muted">출퇴근할 직원이 없습니다. 관리자 화면에서 직원에게 PIN을 만들어 주세요.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="직원 목록">
            {employees.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => choose(e)} className="flex min-h-20 w-full items-center justify-between gap-3 rounded-xl border border-secondary bg-white px-5 py-4 text-left shadow-sm transition active:bg-secondary/60">
                  <span className="text-xl font-bold text-foreground">{e.name}</span>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${e.status === "in" ? "bg-emerald-100 text-emerald-900" : e.stale ? "bg-amber-100 text-amber-900" : "bg-secondary/60 text-foreground"}`}>
                    {e.status === "in" ? "출근 중 → 퇴근" : e.stale ? "퇴근 기록 필요 · 사장님께 문의" : "퇴근 → 출근"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {phase.kind === "blocked" ? (
        <div role="alert" className="mx-auto max-w-md space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
          <p className="text-lg font-bold">{phase.emp.name}님, 지금은 출근할 수 없습니다.</p>
          <p className="text-sm leading-relaxed">전 근무의 퇴근 기록이 없습니다. 사장님께 퇴근 시각 정정을 요청해 주세요. 정정되면 바로 출근을 기록할 수 있습니다.</p>
          <button type="button" onClick={() => setPhase({ kind: "list" })} className="w-full rounded-xl border border-amber-700 px-4 py-3 text-base font-semibold">
            확인
          </button>
        </div>
      ) : null}

      {phase.kind === "pin" ? (
        <div className="mx-auto max-w-xs space-y-4">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{phase.emp.name}님</p>
            <p className="mt-1 text-base font-semibold text-primary">{phase.emp.status === "in" ? "퇴근" : "출근"}하려면 PIN 4자리를 누르세요</p>
          </div>
          <p className="flex justify-center gap-3 text-3xl tracking-widest text-foreground" aria-live="polite" aria-label={`입력한 자릿수 ${digits.length}`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="w-6 text-center">
                {i < digits.length ? "●" : "○"}
              </span>
            ))}
          </p>
          <p role="alert" className="min-h-10 text-center text-sm font-medium text-red-700">
            {message}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button key={k} type="button" disabled={busy} onClick={() => press(k, phase.emp)} className={`${btn} ${k === "지움" || k === "확인" ? "text-base" : ""}`}>
                {k}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPhase({ kind: "list" })} className="w-full rounded-xl border border-primary px-4 py-3 text-base font-semibold text-primary">
            취소
          </button>
        </div>
      ) : null}

      {phase.kind === "done" ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center text-emerald-900">
          <p className="text-3xl font-bold">{phase.name}님</p>
          <p className="mt-3 text-4xl font-bold">{phase.punch === "in" ? "출근" : "퇴근"} 완료</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{fmtClockTime(phase.at)}</p>
          <button type="button" onClick={() => setPhase({ kind: "list" })} className="mt-6 rounded-xl border border-emerald-700 px-6 py-3 text-base font-semibold">
            확인
          </button>
        </div>
      ) : null}
    </div>
  );
}
