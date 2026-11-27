"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { publicApi } from "@/lib/contract/client/api";
import { toKstLocal } from "@/lib/contract/clock-sheet";
import type { DepositRecord } from "@/lib/contract/server/store";

type Board = { deposits: DepositRecord[]; serverNow: string };

const REFRESH_MS = 3000;
/** 이보다 오래된 미확인 건은 이 창에서 다시 알리지 않는다(입금 확인 화면 목록에는 남는다). */
const WINDOW_MS = 24 * 60 * 60 * 1000;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const hm = (iso: string) => toKstLocal(iso).slice(11, 16);
const md = (iso: string) => toKstLocal(iso).slice(5, 10).replace("-", "/");

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

  const pending = useMemo(() => (rows ?? []).filter((d) => !d.confirmedAt && now - Date.parse(d.occurredAt) < WINDOW_MS), [rows, now]);

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

  async function confirm(id: string) {
    if (test) return setRows([]);
    setBusy(id);
    const r = await publicApi<{ deposit: DepositRecord }>("/api/deposits", { method: "PATCH", body: { id, confirmed: true } });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    setRows((cur) => (cur ?? []).map((d) => (d.id === id ? r.deposit : d)));
  }

  async function confirmAll() {
    for (const d of pending) await confirm(d.id);
  }

  if (error && rows === null) return <p className="p-6 text-lg font-semibold text-red-700">{error}</p>;
  if (rows === null) return <p className="p-6 text-lg text-muted">불러오는 중입니다...</p>;

  if (!pending.length) {
    return (
      <div className="p-8 text-center">
        <p className="text-2xl font-bold text-foreground">확인할 입금이 없습니다.</p>
        <p className="mt-2 text-base text-muted">이 창은 닫으셔도 됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-foreground">확인 안 된 입금 {pending.length}건</h1>
        {pending.length > 1 ? (
          <button type="button" onClick={() => void confirmAll()} className="rounded-xl border-2 border-primary px-4 py-2 text-lg font-bold text-primary">
            모두 확인
          </button>
        ) : null}
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-base font-semibold text-red-700">{error}</p> : null}
      <ul className="space-y-3">
        {pending.slice(0, 5).map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-primary bg-white p-4">
            <div>
              <p className="text-5xl font-extrabold leading-tight text-foreground">{d.unparsed ? "읽지 못한 입금" : won(d.amount)}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {d.unparsed ? "은행 앱에서 직접 확인해 주세요." : d.depositor}
                <span className="ml-3 text-lg font-normal text-muted">
                  {md(d.occurredAt)} {hm(d.occurredAt)}
                </span>
              </p>
            </div>
            <button
              type="button"
              disabled={busy === d.id}
              onClick={() => void confirm(d.id)}
              className="min-h-16 min-w-32 rounded-2xl bg-primary px-8 py-4 text-3xl font-extrabold text-white disabled:opacity-60"
            >
              확인
            </button>
          </li>
        ))}
      </ul>
      {pending.length > 5 ? <p className="text-lg font-semibold text-muted">그 밖에 {pending.length - 5}건은 입금 확인 화면에서 확인해 주세요.</p> : null}
    </div>
  );
}
