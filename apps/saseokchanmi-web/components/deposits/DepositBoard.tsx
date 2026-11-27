"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notice, btnOutline, btnPrimary, inputCls } from "@/components/admin/ui";
import { adminApi, publicApi } from "@/lib/contract/client/api";
import { toKstLocal } from "@/lib/contract/clock-sheet";
import type { DepositRecord } from "@/lib/contract/server/store";

type Board = { days: number; deposits: DepositRecord[]; lastIngestAt: string | null; serverNow: string };

const REFRESH_MS = 5000;
const STALE_MS = 6 * 60 * 60 * 1000;
/** 확인하지 않은 입금이 있으면 이 간격으로 알림을 다시 띄운다. */
const REMIND_MS = 60 * 1000;
/** 이보다 오래된 미확인 건은 다시 알리지 않는다(화면 목록에는 계속 남는다). */
const REMIND_WINDOW_MS = 24 * 60 * 60 * 1000;
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

let swReg: ServiceWorkerRegistration | null = null;

/** 알림을 누르거나 알림창의 '확인' 버튼을 누르면 서비스 워커(public/deposit-sw.js)가 바로 확인 처리한다. */
function noticeOf(d: DepositRecord, renotify: boolean): { title: string; options: NotificationOptions } {
  return {
    title: d.unparsed ? "문자를 읽지 못한 입금이 있습니다" : `새 입금 ${won(d.amount)}`,
    options: {
      body: d.unparsed ? "은행 앱에서 직접 확인해 주세요.\n알림을 누르면 확인 처리됩니다." : `${d.depositor} · ${md(d.occurredAt)} ${hm(d.occurredAt)}\n알림을 누르면 확인 처리됩니다.`,
      tag: `dep-${d.id}`,
      requireInteraction: true, // 직원이 누르기 전에는 화면에 남는다
      data: { id: d.id },
      actions: [{ action: "confirm", title: "확인" }],
      renotify, // 재알림일 때만 같은 알림을 새로 울린다(처음 알림은 한 번만)
    } as NotificationOptions,
  };
}

/**
 * 입금 확인 화면이 두 곳(앱 창과 일반 탭 등)에 열려 있어도 같은 입금의 알림이 겹쳐 뜨지 않게, 같은 브라우저 안에서
 * 최근에 이 입금을 알린 시각을 공유한다. 처음 알림은 20초, 재알림은 45초 안에는 다시 띄우지 않는다.
 */
function claimNotice(id: string, reminder: boolean): boolean {
  const key = `deposit-notified:${id}`;
  const gap = reminder ? 45_000 : 20_000;
  try {
    const last = Number(localStorage.getItem(key) ?? 0);
    const t = Date.now();
    if (t - last < gap) return false;
    localStorage.setItem(key, String(t));
  } catch {
    /* 저장소를 못 쓰면 그냥 알린다 */
  }
  return true;
}

/** 큰 알림 창(/deposits/popup). 팝업이 막혀 있으면 false를 돌려주고, 그때는 작은 윈도우 알림으로 대신한다. */
let popupWin: Window | null = null;
let popupEnabled = false;
let popupBlocked = false;
function openPopup(): boolean {
  if (!popupEnabled || typeof window === "undefined") return false;
  try {
    if (popupWin && !popupWin.closed) {
      popupWin.focus();
      return true;
    }
    const w = 680;
    const h = 520;
    const left = Math.max(0, Math.round((window.screen.availWidth - w) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - h) / 2));
    const win = window.open("/deposits/popup", "deposit-popup", `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
    if (!win) {
      popupBlocked = true;
      return false;
    }
    popupBlocked = false;
    popupWin = win;
    win.focus();
    return true;
  } catch {
    popupBlocked = true;
    return false;
  }
}

/** 윈도우 알림 팝업. 포스 프로그램 위에도 화면 구석에 뜬다. 권한이 없거나 실패해도 화면 동작에는 영향이 없다. */
function notifyDeposit(d: DepositRecord, reminder = false) {
  if (!claimNotice(d.id, reminder)) return;
  if (openPopup()) return; // 큰 창이 열렸으면 작은 알림은 띄우지 않는다
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const { title, options } = noticeOf(d, reminder);
  try {
    if (swReg) {
      void swReg.showNotification(title, options).catch(() => undefined);
      return;
    }
    // 서비스 워커를 쓸 수 없는 환경: 알림을 누르면 이 창만 앞으로 나온다(확인 처리는 화면에서).
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* 알림을 만들지 못해도 목록과 소리는 그대로 동작한다 */
  }
}

/** 확인이 끝난 입금(목록에 없거나 이미 확인됨)의 알림은 화면에서 치운다. */
function closeResolved(pendingIds: Set<string>) {
  if (!swReg) return;
  void swReg
    .getNotifications()
    .then((list) =>
      list.forEach((n) => {
        const id = (n.data as { id?: string } | null)?.id;
        if (id && !pendingIds.has(id)) n.close();
      }),
    )
    .catch(() => undefined);
}

/**
 * 아직 확인하지 않은 입금의 재알림. 윈도우는 알림을 몇 초 뒤 알림 센터로 치워 버리므로,
 * 직원이 알림을 눌러 확인할 때까지 1분마다 같은 알림을 다시 띄운다.
 */
function remindPending(pending: DepositRecord[]) {
  pending.slice(0, 3).forEach((d) => notifyDeposit(d, true));
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
  const [days] = useState(1); // 내역은 당일 것만 보관한다
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
  const pendingRef = useRef<DepositRecord[]>([]);
  const [popupBlockedUi, setPopupBlockedUi] = useState(false);

  useEffect(() => {
    popupEnabled = !admin; // 포스기(등록된 기기)에서만 큰 창을 연다. 관리자 화면에서는 열지 않는다.
    return () => {
      popupEnabled = false;
    };
  }, [admin]);

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
      all.slice(0, 5).forEach((d) => notifyDeposit(d)); // 한꺼번에 많이 와도 팝업은 5개까지만
      setPopupBlockedUi(popupBlocked);
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
  const pending = useMemo(() => (now === null ? [] : rows.filter((d) => !d.confirmedAt && now - Date.parse(d.occurredAt) < REMIND_WINDOW_MS)), [rows, now]);
  useEffect(() => {
    pendingRef.current = pending;
    document.title = pending.length ? `(${pending.length}) 확인 안 된 입금` : "입금 확인";
    closeResolved(new Set(pending.map((d) => d.id)));
  }, [pending]);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/deposit-sw.js", { scope: "/deposits" })
      .then((reg) => {
        swReg = reg;
      })
      .catch(() => undefined);
  }, []);
  useEffect(
    () =>
      startTicker(() => {
        const p = pendingRef.current;
        if (!p.length) return;
        remindPending(p);
        setPopupBlockedUi(popupBlocked);
        if (soundOn.current && audio.current) beep(audio.current);
      }, REMIND_MS),
    [],
  );
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
          {notif !== "unsupported" ? (
            <button type="button" className={notif === "granted" ? btnPrimary : btnOutline} onClick={enableNotify} disabled={notif === "denied"} aria-pressed={notif === "granted"}>
              {notif === "granted" ? "팝업 알림 켜짐" : notif === "denied" ? "팝업 알림 막힘" : "팝업 알림 켜기"}
            </button>
          ) : null}
          <button type="button" className={sound ? btnPrimary : btnOutline} onClick={enableSound} aria-pressed={sound}>
            {sound ? "소리 켜짐" : "소리 켜기"}
          </button>
          {!admin ? (
            <button type="button" className={btnOutline} onClick={() => window.open("/deposits/popup?test=1", "deposit-popup-test", "popup=yes,width=680,height=520")}>
              큰 알림 시험
            </button>
          ) : null}
          <a href="/api/deposits/autostart" download className={btnOutline} title="포스기에서 한 번 실행하면 PC를 켤 때 이 화면이 자동으로 열립니다">
            자동 실행 설정 파일
          </a>
        </div>
      </div>

      {error ? <Notice tone="error">{error.text}</Notice> : null}
      {popupBlockedUi ? (
        <Notice tone="error">
          큰 알림 창이 막혀 있어 작은 알림으로 대신하고 있습니다. 크롬 설정 → 개인정보 및 보안 → 사이트 설정 → 팝업 및 리디렉션에서 &lsquo;팝업 전송 및 리디렉션 사용 가능&rsquo;에 https://www.saseokchanmi.com 을 추가해 주세요.
        </Notice>
      ) : null}
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
