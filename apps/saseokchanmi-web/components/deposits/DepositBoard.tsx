"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notice, btnOutline, btnPrimary, inputCls } from "@/components/admin/ui";
import { adminApi, publicApi } from "@/lib/contract/client/api";
import { toKstLocal } from "@/lib/contract/clock-sheet";
import type { DepositRecord } from "@/lib/contract/server/store";

type Board = { days: number; deposits: DepositRecord[]; lastIngestAt: string | null; serverNow: string };

const REFRESH_MS = 5000;
const STALE_MS = 6 * 60 * 60 * 1000;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const hm = (iso: string) => toKstLocal(iso).slice(11, 16);
const md = (iso: string) => toKstLocal(iso).slice(5, 10).replace("-", "/");

function ago(fromIso: string, nowMs: number): string {
  const min = Math.max(0, Math.floor((nowMs - Date.parse(fromIso)) / 60000));
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  return h < 48 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}

type NotifState = "unsupported" | NotificationPermission;

/**
 * 주기 실행. 창이 가려져 있으면 브라우저가 일반 타이머를 몇 분 뒤부터 1분에 한 번으로 늦추기 때문에,
 * 늦춰지지 않는 Web Worker의 타이머로 박자를 맞춘다(워커를 못 쓰면 일반 타이머로 대신한다).
 */
function startTicker(fn: () => void, ms: number): () => void {
  try {
    const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms});`], { type: "text/javascript" }));
    const w = new Worker(url);
    w.onmessage = () => fn();
    return () => {
      w.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
  }
}

/** 윈도우 알림 팝업. 포스 프로그램 위에도 화면 구석에 뜬다. 권한이 없거나 실패해도 화면 동작에는 영향이 없다. */
function notifyDeposit(d: DepositRecord) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const n = new Notification(d.unparsed ? "문자를 읽지 못한 입금이 있습니다" : `새 입금 ${won(d.amount)}`, {
      body: d.unparsed ? "은행 앱에서 직접 확인해 주세요." : `${d.depositor} · ${md(d.occurredAt)} ${hm(d.occurredAt)}`,
      tag: d.id,
      requireInteraction: true, // 직원이 닫을 때까지 화면에 남는다(바빠서 놓치지 않도록)
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* 알림을 만들지 못해도 목록과 소리는 그대로 동작한다 */
  }
}

/** 짧은 알림음. 브라우저는 사용자가 한 번 눌러야 소리를 낼 수 있어서 "소리 켜기" 버튼에서 연결한다. */
function beep(ctx: AudioContext) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.65);
}

/**
 * 입금 확인 화면. 포스기에는 등록된 매장 기기로, 관리자 화면에는 로그인 상태로 같은 화면을 쓴다.
 * 5초마다 새로 불러오고, 새 입금이 들어오면 소리와 강조로 알린다. 직원이 계산서와 대조한 뒤 "확인"을 누른다.
 */
export function DepositBoard({ admin = false }: { admin?: boolean }) {
  const api = admin ? adminApi : publicApi;
  const [days, setDays] = useState(1);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<{ text: string; noDevice: boolean } | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [sound, setSound] = useState(false);
  const [notif, setNotif] = useState<NotifState>("unsupported");
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundOn = useRef(false);

  const load = useCallback(async () => {
    const r = await api<Board>(`/api/deposits?days=${days}`);
    if (!r.ok) {
      setError({ text: r.error, noDevice: r.status === 403 });
      return;
    }
    setError(null);
    setBoard(r);
    setNow(Date.parse(r.serverNow));
    const ids = new Set(r.deposits.map((d) => d.id));
    if (seen.current) {
      const all = r.deposits.filter((d) => !seen.current!.has(d.id));
      all.slice(0, 5).forEach(notifyDeposit); // 한꺼번에 많이 와도 팝업은 5개까지만
      const added = all.filter((d) => !d.unparsed);
      if (added.length) {
        setFresh((f) => new Set([...f, ...added.map((d) => d.id)]));
        if (soundOn.current && audio.current) beep(audio.current);
      }
    }
    seen.current = ids;
  }, [api, days]);

  useEffect(() => {
    seen.current = null; // 기간을 바꾸면 처음부터 다시 본다(이미 있던 입금을 새 입금으로 알리지 않는다)
    queueMicrotask(() => void load());
    return startTicker(() => void load(), REFRESH_MS);
  }, [load]);

  useEffect(() => {
    queueMicrotask(() => setNotif(typeof Notification === "undefined" ? "unsupported" : Notification.permission));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow((n) => (n === null ? n : n + 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  function enableSound() {
    if (!audio.current) audio.current = new AudioContext();
    void audio.current.resume();
    beep(audio.current);
    soundOn.current = true;
    setSound(true);
  }

  async function enableNotify() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setNotif(p);
    if (p === "granted") {
      try {
        new Notification("입금 알림이 켜졌습니다", { body: "새 입금이 들어오면 이렇게 화면 구석에 표시됩니다." });
      } catch {
        /* 시험 알림이 실패해도 권한은 저장된다 */
      }
    }
  }

  async function patch(id: string, body: { confirmed?: boolean; memo?: string }) {
    setBusy(id);
    const r = await api<{ deposit: DepositRecord }>("/api/deposits", { method: "PATCH", body: { id, ...body } });
    setBusy(null);
    if (!r.ok) return setError({ text: r.error, noDevice: r.status === 403 });
    setFresh((f) => {
      const n = new Set(f);
      n.delete(id);
      return n;
    });
    setBoard((b) => (b ? { ...b, deposits: b.deposits.map((d) => (d.id === id ? r.deposit : d)) } : b));
  }

  const rows = useMemo(() => board?.deposits ?? [], [board]);
  const summary = useMemo(() => {
    const real = rows.filter((d) => !d.unparsed);
    return { total: real.reduce((t, d) => t + d.amount, 0), count: real.length, open: real.filter((d) => !d.confirmedAt).length, unparsed: rows.filter((d) => d.unparsed && !d.confirmedAt).length };
  }, [rows]);
  const stale = board && now !== null && (board.lastIngestAt === null || now - Date.parse(board.lastIngestAt) > STALE_MS);

  if (error && !board) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-foreground">입금 확인</h1>
        <Notice tone="error">{error.text}</Notice>
        {error.noDevice ? <p className="text-sm text-muted">사장님이 관리자 화면 → 출퇴근에서 &lsquo;이 기기를 출퇴근 기기로 등록&rsquo;을 누르면 이 화면을 볼 수 있습니다.</p> : null}
      </div>
    );
  }
  if (!board) return <p className="text-sm text-muted">불러오는 중입니다...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">입금 확인</h1>
          <p className="mt-1 text-sm text-muted">
            계좌이체로 들어온 입금입니다. 카드 결제 정산은 표시하지 않습니다.
            {summary.count ? ` ${days === 1 ? "오늘" : `최근 ${days}일`} ${summary.count}건 · 합계 ${won(summary.total)} · 확인 대기 ${summary.open}건` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="기간" className="flex overflow-hidden rounded-lg border border-primary">
            {[1, 7].map((d) => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={`px-3 py-2 text-sm font-semibold ${days === d ? "bg-primary text-white" : "text-primary"}`}>
                {d === 1 ? "오늘" : "7일"}
              </button>
            ))}
          </div>
          {notif !== "unsupported" ? (
            <button type="button" className={notif === "granted" ? btnPrimary : btnOutline} onClick={enableNotify} disabled={notif === "denied"} aria-pressed={notif === "granted"}>
              {notif === "granted" ? "팝업 알림 켜짐" : notif === "denied" ? "팝업 알림 막힘" : "팝업 알림 켜기"}
            </button>
          ) : null}
          <button type="button" className={sound ? btnPrimary : btnOutline} onClick={enableSound} aria-pressed={sound}>
            {sound ? "소리 켜짐" : "소리 켜기"}
          </button>
        </div>
      </div>

      {error ? <Notice tone="error">{error.text}</Notice> : null}
      {notif === "denied" ? (
        <Notice tone="error">팝업 알림이 막혀 있습니다. 크롬 주소창 왼쪽의 설정 아이콘(자물쇠) → 사이트 설정 → 알림을 &lsquo;허용&rsquo;으로 바꾼 뒤 이 화면을 새로 고쳐 주세요.</Notice>
      ) : null}
      {stale ? (
        <Notice tone="error">
          {board.lastIngestAt ? `입금 문자를 마지막으로 받은 지 ${ago(board.lastIngestAt, now ?? Date.parse(board.serverNow))} 되었습니다.` : "아직 입금 문자를 받은 적이 없습니다."} 폰이 꺼졌거나 인터넷이 끊겼는지 확인해 주세요. 입금이 의심되면 은행 앱에서 직접 확인해 주세요.
        </Notice>
      ) : null}
      {summary.unparsed ? <Notice tone="error">문자를 읽지 못한 입금 {summary.unparsed}건이 있습니다. 은행 앱에서 직접 확인해 주세요.</Notice> : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-secondary bg-white p-8 text-center text-muted">{days === 1 ? "오늘 들어온 계좌이체 입금이 아직 없습니다." : "최근 들어온 계좌이체 입금이 없습니다."}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((d) => {
            const done = d.confirmedAt !== null;
            const isNew = fresh.has(d.id);
            return (
              <li key={d.id} className={`rounded-xl border p-4 ${d.unparsed ? "border-red-300 bg-red-50" : done ? "border-secondary bg-secondary/20 text-muted" : isNew ? "border-primary bg-white ring-2 ring-primary/40" : "border-secondary bg-white"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    {d.unparsed ? (
                      <>
                        <p className="font-bold text-red-800">문자를 읽지 못한 입금입니다</p>
                        <p className="mt-1 break-all text-xs text-red-800/80">{d.memo}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold tabular-nums text-foreground">{won(d.amount)}</p>
                        <p className="mt-1 text-lg font-semibold">
                          {d.depositor}
                          <span className="ml-3 text-sm font-normal text-muted">
                            {md(d.occurredAt)} {hm(d.occurredAt)}
                          </span>
                          {isNew ? <span className="ml-3 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">새 입금</span> : null}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!d.unparsed ? (
                      <input
                        aria-label={`${d.depositor} ${won(d.amount)} 메모`}
                        className={`${inputCls} w-40`}
                        placeholder="메모(테이블 등)"
                        maxLength={60}
                        value={memos[d.id] ?? d.memo}
                        onChange={(e) => setMemos((m) => ({ ...m, [d.id]: e.target.value }))}
                        onBlur={() => memos[d.id] !== undefined && memos[d.id] !== d.memo && void patch(d.id, { memo: memos[d.id] })}
                      />
                    ) : null}
                    {done ? (
                      <>
                        <span className="text-sm">확인됨 {hm(d.confirmedAt!)}</span>
                        <button type="button" className={btnOutline} disabled={busy === d.id} onClick={() => patch(d.id, { confirmed: false })}>
                          취소
                        </button>
                      </>
                    ) : (
                      <button type="button" className={btnPrimary} disabled={busy === d.id} onClick={() => patch(d.id, { confirmed: true })}>
                        확인
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted">
        {board.lastIngestAt ? `마지막 입금 문자 수신: ${ago(board.lastIngestAt, now ?? Date.parse(board.serverNow))}` : "마지막 입금 문자 수신: 없음"} · 5초마다 자동으로 새로 고칩니다. 입금 내역은 90일 후 지워집니다.
      </p>
    </div>
  );
}
