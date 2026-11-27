"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { publicApi } from "@/lib/contract/client/api";
import { toKstLocal } from "@/lib/contract/clock-sheet";
import type { DepositRecord } from "@/lib/contract/server/store";

type Board = { deposits: DepositRecord[]; serverNow: string };

const REFRESH_MS = 3000;
const DONE_SHOW_MS = 1200; // 확인 완료 표시를 보여 주는 시간
/** 이보다 오래된 미확인 건은 이 창에서 다시 알리지 않는다(입금 확인 화면 목록에는 남는다). */
const WINDOW_MS = 24 * 60 * 60 * 1000;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const hm = (iso: string) => toKstLocal(iso).slice(11, 16);
const md = (iso: string) => toKstLocal(iso).slice(5, 10).replace("-", "/");
const ago = (iso: string, nowMs: number) => {
  const min = Math.max(0, Math.floor((nowMs - Date.parse(iso)) / 60000));
  return min < 1 ? "방금" : min < 60 ? `${min}분 전` : `${Math.floor(min / 60)}시간 전`;
};

const SAMPLE: DepositRecord = { id: "sample", amount: 12000, depositor: "홍길동", occurredAt: new Date().toISOString(), receivedAt: new Date().toISOString(), confirmedAt: null, memo: "" };

/**
 * 입금 알림 큰 창. 입금 확인 화면이 새 입금(또는 확인 안 된 입금)을 보면 이 창을 연다.
 * 확인하지 않은 입금을 큰 글자로 보여 주고, "확인"을 누르면 그 입금을 확인 처리한다. 전부 확인하면 창이 저절로 닫힌다.
 * `?test=1` 로 열면 예시 입금으로 모양만 보여 준다(시험용).
 */
export function DepositPopup() {
  const [rows, setRows] = useState<DepositRecord[] | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // 방금 확인한 입금: 버튼이 초록색 "확인 완료"로 바뀐 모습을 잠깐 보여 준 뒤 목록에서 지운다.
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [test] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("test"));
  const sawPending = useRef(false);

  const load = useCallback(async () => {
    if (test) {
      setRows([SAMPLE]);
      setNow(Date.now());
      return;
    }
    const r = await publicApi<Board>("/api/deposits?days=1");
    if (!r.ok) return setError(r.error);
    setError(null);
    setRows(r.deposits);
    setNow(Date.parse(r.serverNow));
  }, [test]);

  useEffect(() => {
    queueMicrotask(() => void load());
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const pending = useMemo(() => (rows ?? []).filter((d) => (!d.confirmedAt || done.has(d.id)) && now - Date.parse(d.occurredAt) < WINDOW_MS), [rows, now, done]);

  useEffect(() => {
    if (pending.length) {
      sawPending.current = true;
      document.title = `(${pending.length}) 확인 안 된 입금`;
      return;
    }
    document.title = "입금 확인";
    // 확인할 입금이 없어지면 창을 닫는다(스크립트로 열린 창만 닫힌다. 직접 연 창이면 안내 문구가 남는다).
    if (rows !== null && sawPending.current && !test) window.close();
  }, [pending, rows, test]);

  function markDone(id: string, after?: () => void) {
    setDone((cur) => new Set(cur).add(id));
    setTimeout(() => {
      setDone((cur) => {
        const next = new Set(cur);
        next.delete(id);
        return next;
      });
      after?.();
    }, DONE_SHOW_MS);
  }

  async function confirm(id: string) {
    if (test) return markDone(id, () => setRows([]));
    setBusy(id);
    const r = await publicApi<{ deposit: DepositRecord }>("/api/deposits", { method: "PATCH", body: { id, confirmed: true } });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    markDone(id);
    setRows((cur) => (cur ?? []).map((d) => (d.id === id ? r.deposit : d)));
  }

  async function confirmAll() {
    for (const d of pending) if (!done.has(d.id)) await confirm(d.id);
  }

  if (error && rows === null) return <p className="p-6 text-lg font-semibold text-red-700">{error}</p>;
  if (rows === null) return <p className="p-6 text-lg text-muted">불러오는 중입니다...</p>;

  if (!pending.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-3xl font-bold text-foreground">확인할 입금이 없습니다</p>
        <p className="text-lg text-muted">이 창은 닫으셔도 됩니다.</p>
      </div>
    );
  }

  const [first, ...others] = pending;
  const shown = others.slice(0, 4);
  const hidden = others.length - shown.length;

  return (
    <div className="-mx-4 -my-6 flex min-h-screen flex-col sm:-my-10">
      <header className="flex items-center justify-between gap-3 border-b-4 border-primary bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Image src="/images/logo.png" alt="사색찬미한정식" width={2081} height={700} priority className="h-10 w-auto" />
          <span className="h-8 w-px bg-primary/25" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">입금 알림</h1>
          </div>
        </div>
        <p className="rounded-full bg-primary px-4 py-1.5 text-base font-semibold text-white">확인 대기 {pending.length}건</p>
      </header>

      <main className="flex-1 space-y-4 p-6">
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-base font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <section aria-label="새 입금" className="rounded-2xl border border-primary/30 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3 text-muted">
            <span className="text-sm font-semibold tracking-widest">{first.unparsed ? "확인 필요" : "계좌이체 입금"}</span>
            <span className="text-base tabular-nums">
              {md(first.occurredAt)} {hm(first.occurredAt)} · {ago(first.receivedAt, now)}
            </span>
          </div>
          <p className="mt-3 text-6xl font-extrabold leading-none tracking-tight text-foreground tabular-nums">{first.unparsed ? "문자를 읽지 못했습니다" : won(first.amount)}</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{first.unparsed ? "은행 앱에서 직접 확인해 주세요." : first.depositor}</p>
          <button
            type="button"
            disabled={busy === first.id || done.has(first.id)}
            onClick={() => void confirm(first.id)}
            className={`mt-6 h-16 w-full rounded-xl text-2xl font-bold text-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              done.has(first.id) ? "bg-emerald-600" : "bg-primary active:bg-primary/80 disabled:opacity-60"
            }`}
          >
            {done.has(first.id) ? "✓ 확인 완료. 감사합니다" : "입금 확인했습니다. 감사합니다"}
          </button>
        </section>

        {shown.length ? (
          <ul aria-label="다른 확인 대기 입금" className="divide-y divide-primary/15 overflow-hidden rounded-2xl border border-primary/20 bg-white">
            {shown.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{d.unparsed ? "읽지 못한 입금" : won(d.amount)}</p>
                  <p className="truncate text-base text-muted">
                    {d.unparsed ? "은행 앱에서 확인" : d.depositor} · {hm(d.occurredAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === d.id || done.has(d.id)}
                  onClick={() => void confirm(d.id)}
                  className={`h-12 shrink-0 rounded-lg border-2 px-6 text-lg font-bold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    done.has(d.id) ? "border-emerald-600 bg-emerald-600 text-white" : "border-primary text-primary disabled:opacity-60"
                  }`}
                >
                  {done.has(d.id) ? "✓ 완료" : "확인"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {hidden > 0 ? <p className="text-base font-semibold text-muted">그 밖에 {hidden}건은 입금 확인 화면에서 확인해 주세요.</p> : null}
        {others.length ? (
          <button type="button" onClick={() => void confirmAll()} className="h-12 w-full rounded-xl border border-primary/40 text-lg font-semibold text-primary">
            모두 입금 확인했습니다. 감사합니다
          </button>
        ) : null}
      </main>

      <footer className="px-6 pb-5 text-sm text-muted">계산서와 금액을 대조한 뒤 확인해 주세요. 확인하면 알림이 사라지고 입금 확인 화면에 기록됩니다.</footer>
    </div>
  );
}
