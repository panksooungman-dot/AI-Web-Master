"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import "@/lib/contract/paper.css";
import { adminApi } from "@/lib/contract/client/api";
import { downloadImage, downloadPdf, safeFileName } from "@/lib/contract/client/export";
import { buildSheet, clockSheetHTML, fmtMin, hhmm, isMonth, kst, monthLabel, toKstLocal, type SheetConfig, type SheetEvent } from "@/lib/contract/clock-sheet";
import { Badge, btnDanger, btnOutline, btnPrimary, inputCls, Notice, Panel } from "./ui";

type Employee = { id: string; name: string };
type Audit = { id: string; eventId: string; action: "add" | "edit" | "delete"; before: { kind: "in" | "out"; at: string } | null; after: { kind: "in" | "out"; at: string } | null; reason: string; at: string };
type Data = { employee: Employee; biz: string; config: SheetConfig; events: SheetEvent[]; audit: Audit[]; month: string };

const kindLabel = (k: "in" | "out") => (k === "in" ? "출근" : "퇴근");
const fmtDT = (iso: string) => {
  const k = kst(iso);
  return `${k.m}/${k.d} ${hhmm(iso)}`;
};
const ACTION: Record<Audit["action"], string> = { add: "추가", edit: "수정", delete: "삭제" };
const nowKstMonth = () => toKstLocal(new Date().toISOString()).slice(0, 7);

/** 직원별 월간 출퇴근 기록부: 약정 시간과 비교, 정정(사유·이력), PDF·이미지 저장. */
export function ClockSheet({ initialId, initialMonth }: { initialId: string; initialMonth?: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [id, setId] = useState(initialId);
  const [month, setMonth] = useState(isMonth(initialMonth) ? initialMonth : nowKstMonth());
  const [deduct, setDeduct] = useState(true);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; kind: "in" | "out"; at: string; reason: string } | null>(null);
  const [add, setAdd] = useState({ kind: "in" as "in" | "out", at: toKstLocal(new Date().toISOString()), reason: "" });

  useEffect(() => {
    void adminApi<{ employees: (Employee & { hasPin: boolean })[] }>("/api/admin/clock/employees").then((r) => {
      if (!r.ok) return setNotice({ tone: "error", text: r.error });
      setEmployees(r.employees);
      setId((cur) => cur || r.employees[0]?.id || "");
    });
  }, []);

  const load = useCallback(async () => {
    if (!id || !isMonth(month)) return setData(null);
    setLoading(true);
    const r = await adminApi<Data>(`/api/admin/clock/sheet?id=${encodeURIComponent(id)}&month=${month}`);
    setLoading(false);
    if (r.ok) setData(r);
    else {
      setData(null);
      setNotice({ tone: "error", text: r.error });
    }
  }, [id, month]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const sheet = useMemo(() => (data ? buildSheet({ month: data.month, events: data.events, config: data.config, deductBreak: deduct }) : null), [data, deduct]);
  const html = useMemo(() => (data && sheet ? clockSheetHTML(sheet, { biz: data.biz, name: data.employee.name, deductBreak: deduct }) : ""), [data, sheet, deduct]);
  const monthEvents = useMemo(() => (data ? data.events.filter((e) => kst(e.at).date.startsWith(month)) : []), [data, month]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r.ok) {
      setNotice({ tone: "ok", text: okText });
      setEditing(null);
      await load();
    } else setNotice({ tone: "error", text: r.error ?? "처리하지 못했습니다." });
  }

  const saveEdit = () =>
    editing &&
    run(() => adminApi(`/api/admin/clock/events/${editing.id}`, { method: "PATCH", body: { kind: editing.kind, at: editing.at, reason: editing.reason } }), "기록을 정정했습니다. 이력에 남았습니다.");

  function remove(eid: string) {
    const reason = window.prompt("삭제 사유를 입력해 주세요. (이력에 남습니다)");
    if (!reason?.trim()) return;
    void run(() => adminApi(`/api/admin/clock/events/${eid}`, { method: "DELETE", body: { reason } }), "기록을 삭제했습니다. 이력에 남았습니다.");
  }

  const addEvent = () => run(() => adminApi("/api/admin/clock/events", { method: "POST", body: { submissionId: id, ...add } }), "기록을 추가했습니다. 이력에 남았습니다.");

  async function exportFile(kind: "pdf" | "png") {
    if (!data) return;
    setBusy(true);
    try {
      const base = `출퇴근기록부_${safeFileName(data.employee.name)}_${month}`;
      if (kind === "pdf") await downloadPdf(html, false, `${base}.pdf`);
      else await downloadImage(html, false, `${base}.png`);
    } catch {
      setNotice({ tone: "error", text: "파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  const t = sheet?.totals;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">월간 출퇴근 기록부</h1>
          <p className="mt-1 text-sm text-muted">직원과 달을 고르면 출퇴근 기록을 약정 근무와 비교해 보여 줍니다.</p>
        </div>
        <Link href="/admin/clock" className={btnOutline}>
          ← 출퇴근 관리
        </Link>
      </div>

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <Panel title="조회">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="sheet-emp" className="block text-sm font-semibold text-foreground">
              직원
            </label>
            <select id="sheet-emp" className={`${inputCls} min-w-40`} value={id} onChange={(e) => setId(e.target.value)}>
              {employees.length === 0 ? <option value="">확정된 직원 없음</option> : null}
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sheet-month" className="block text-sm font-semibold text-foreground">
              월
            </label>
            <input id="sheet-month" type="month" className={inputCls} value={month} onChange={(e) => isMonth(e.target.value) && setMonth(e.target.value)} />
          </div>
          <label htmlFor="sheet-deduct" className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
            <input id="sheet-deduct" type="checkbox" checked={deduct} onChange={(e) => setDeduct(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            약정 휴게시간 자동 차감
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">직원이 휴게 시간에 퇴근·출근을 따로 찍는다면 자동 차감을 끄세요. 켜 두면 계약서의 휴게시간만큼 근무시간에서 뺍니다.</p>
      </Panel>

      {loading && !data ? <p className="text-sm text-muted">불러오는 중입니다...</p> : null}

      {data && sheet && t ? (
        <>
          <Panel
            title={`${data.employee.name} · ${monthLabel(month)}`}
            aside={
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} disabled={busy} onClick={() => exportFile("pdf")}>
                  PDF로 저장
                </button>
                <button type="button" className={btnOutline} disabled={busy} onClick={() => exportFile("png")}>
                  이미지로 저장
                </button>
              </div>
            }
          >
            <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted">근무일</dt>
                <dd className="text-lg font-bold">{t.workedDays}일</dd>
              </div>
              <div>
                <dt className="text-muted">실제 근무</dt>
                <dd className="text-lg font-bold">{fmtMin(t.workedMin)}</dd>
              </div>
              <div>
                <dt className="text-muted">약정 근무</dt>
                <dd className="text-lg font-bold">{t.scheduledMin == null ? "요일 지정 없음" : fmtMin(t.scheduledMin)}</dd>
              </div>
              <div>
                <dt className="text-muted">차이</dt>
                <dd className="text-lg font-bold">{t.diffMin == null ? "-" : `${t.diffMin > 0 ? "+" : ""}${fmtMin(t.diffMin)}`}</dd>
              </div>
            </dl>
            {t.openCount > 0 || t.strayCount > 0 ? (
              <div className="mb-3">
                <Notice tone="error">퇴근 기록이 빠진 날 {t.openCount}건, 출근 기록이 빠진 퇴근 {t.strayCount}건이 있습니다. 아래 &lsquo;기록 정정&rsquo;에서 확인해 고쳐 주세요.</Notice>
              </div>
            ) : null}
            {sheet.pay ? (
              <p className="mb-3 text-sm text-foreground">
                참고용 예상 임금: <b>{sheet.pay.amount.toLocaleString("ko-KR")}원</b> <span className="text-muted">(기본시급 {sheet.pay.wage.toLocaleString("ko-KR")}원 × 근무시간, 주휴·연장·야간·휴일 가산수당 제외)</span>
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <div className="paper min-w-[640px]" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </Panel>

          <Panel title="기록 정정">
            <p className="mb-3 text-sm text-muted">빠졌거나 잘못 찍힌 기록을 고칠 수 있습니다. 모든 정정에는 사유가 필요하고, 정정 전 내용이 이력에 남습니다.</p>
            {monthEvents.length === 0 ? (
              <p className="text-sm text-muted">이 달의 기록이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-secondary">
                {monthEvents.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="w-32 text-sm tabular-nums">{fmtDT(e.at)}</span>
                      <Badge tone={e.kind === "in" ? "ok" : "neutral"}>{kindLabel(e.kind)}</Badge>
                      {e.source === "admin" ? <Badge tone="warn">관리자 입력</Badge> : null}
                      <span className="flex-1 text-xs text-muted">{e.source === "admin" ? e.note : ""}</span>
                      <button type="button" className={btnOutline} disabled={busy} onClick={() => setEditing({ id: e.id, kind: e.kind, at: toKstLocal(e.at), reason: "" })}>
                        수정
                      </button>
                      <button type="button" className={btnDanger} disabled={busy} onClick={() => remove(e.id)}>
                        삭제
                      </button>
                    </div>
                    {editing?.id === e.id ? (
                      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-secondary/30 p-3">
                        <select aria-label="구분" className={`${inputCls} w-24`} value={editing.kind} onChange={(ev) => setEditing({ ...editing, kind: ev.target.value as "in" | "out" })}>
                          <option value="in">출근</option>
                          <option value="out">퇴근</option>
                        </select>
                        <input aria-label="날짜·시각(한국 시간)" type="datetime-local" className={`${inputCls} w-52`} value={editing.at} onChange={(ev) => setEditing({ ...editing, at: ev.target.value })} />
                        <input aria-label="정정 사유" className={`${inputCls} min-w-48 flex-1`} placeholder="정정 사유 (예: 퇴근 기록을 깜빡함)" maxLength={200} value={editing.reason} onChange={(ev) => setEditing({ ...editing, reason: ev.target.value })} />
                        <button type="button" className={btnPrimary} disabled={busy || !editing.reason.trim()} onClick={saveEdit}>
                          저장
                        </button>
                        <button type="button" className={btnOutline} onClick={() => setEditing(null)}>
                          취소
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t border-secondary pt-4">
              <p className="mb-2 text-sm font-semibold text-foreground">빠진 기록 추가</p>
              <div className="flex flex-wrap items-end gap-2">
                <select aria-label="추가할 구분" className={`${inputCls} w-24`} value={add.kind} onChange={(ev) => setAdd({ ...add, kind: ev.target.value as "in" | "out" })}>
                  <option value="in">출근</option>
                  <option value="out">퇴근</option>
                </select>
                <input aria-label="추가할 날짜·시각(한국 시간)" type="datetime-local" className={`${inputCls} w-52`} value={add.at} onChange={(ev) => setAdd({ ...add, at: ev.target.value })} />
                <input aria-label="추가 사유" className={`${inputCls} min-w-48 flex-1`} placeholder="사유 (예: 인터넷이 끊겨 기록하지 못함)" maxLength={200} value={add.reason} onChange={(ev) => setAdd({ ...add, reason: ev.target.value })} />
                <button type="button" className={btnPrimary} disabled={busy || !add.reason.trim() || !add.at} onClick={addEvent}>
                  추가
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="정정 이력">
            {data.audit.length === 0 ? (
              <p className="text-sm text-muted">이 달에 정정한 내역이 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {[...data.audit].reverse().map((a) => (
                  <li key={a.id} className="rounded-lg border border-secondary px-3 py-2">
                    <p className="text-foreground">
                      <b>{ACTION[a.action]}</b>{" "}
                      {a.before ? <span>{kindLabel(a.before.kind)} {fmtDT(a.before.at)}</span> : null}
                      {a.before && a.after ? " → " : ""}
                      {a.after ? <span>{kindLabel(a.after.kind)} {fmtDT(a.after.at)}</span> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {fmtDT(a.at)} 정정 · 사유: {a.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
