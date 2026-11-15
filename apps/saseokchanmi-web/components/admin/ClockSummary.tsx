"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import "@/lib/contract/paper.css";
import { adminApi } from "@/lib/contract/client/api";
import { downloadImage, downloadPdf } from "@/lib/contract/client/export";
import { buildSummary, summaryCsv, summaryHTML, type SummaryInput } from "@/lib/contract/clock-summary";
import { fmtMin, isMonth, monthLabel, toKstLocal } from "@/lib/contract/clock-sheet";
import { Badge, btnOutline, btnPrimary, inputCls, Notice, Panel } from "./ui";

type Data = { month: string; biz: string; employees: SummaryInput[] };
const nowKstMonth = () => toKstLocal(new Date().toISOString()).slice(0, 7);

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** 전 직원 월간 출퇴근 요약: 직원별 근무시간·약정 비교·참고용 예상 임금을 한 표로, PDF·이미지·엑셀(CSV) 저장. */
export function ClockSummary({ initialMonth }: { initialMonth?: string }) {
  const [month, setMonth] = useState(isMonth(initialMonth) ? initialMonth : nowKstMonth());
  const [deduct, setDeduct] = useState(true);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isMonth(month)) return;
    setLoading(true);
    setError("");
    const r = await adminApi<Data>(`/api/admin/clock/summary?month=${month}`);
    setLoading(false);
    if (r.ok) setData(r);
    else {
      setData(null);
      setError(r.error);
    }
  }, [month]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const summary = useMemo(() => (data ? buildSummary({ month: data.month, employees: data.employees, deductBreak: deduct }) : null), [data, deduct]);
  const html = useMemo(() => (data && summary ? summaryHTML(summary, { biz: data.biz, deductBreak: deduct }) : ""), [data, summary, deduct]);

  async function exportFile(kind: "pdf" | "png" | "csv") {
    if (!summary) return;
    setBusy(true);
    try {
      const base = `출퇴근요약_${month}`;
      if (kind === "csv") save(new Blob(["﻿" + summaryCsv(summary)], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
      else if (kind === "pdf") await downloadPdf(html, false, `${base}.pdf`);
      else await downloadImage(html, false, `${base}.png`);
    } catch {
      setError("파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const t = summary?.totals;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">월간 출퇴근 요약</h1>
          <p className="mt-1 text-sm text-muted">모든 직원의 한 달 근무를 한 표로 봅니다. 직원 이름을 누르면 그 직원의 월간 기록부로 이동합니다.</p>
        </div>
        <Link href="/admin/clock" className={btnOutline}>
          ← 출퇴근 관리
        </Link>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Panel title="조회">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="sum-month" className="block text-sm font-semibold text-foreground">
              월
            </label>
            <input id="sum-month" type="month" className={inputCls} value={month} onChange={(e) => isMonth(e.target.value) && setMonth(e.target.value)} />
          </div>
          <label htmlFor="sum-deduct" className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
            <input id="sum-deduct" type="checkbox" checked={deduct} onChange={(e) => setDeduct(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            약정 휴게시간 자동 차감
          </label>
        </div>
      </Panel>

      {loading && !data ? <p className="text-sm text-muted">불러오는 중입니다...</p> : null}

      {summary && t ? (
        <Panel
          title={`${monthLabel(month)} · 직원 ${summary.rows.length}명`}
          aside={
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={busy || summary.rows.length === 0} onClick={() => exportFile("pdf")}>
                PDF로 저장
              </button>
              <button type="button" className={btnOutline} disabled={busy || summary.rows.length === 0} onClick={() => exportFile("csv")}>
                엑셀(CSV)로 저장
              </button>
              <button type="button" className={btnOutline} disabled={busy || summary.rows.length === 0} onClick={() => exportFile("png")}>
                이미지로 저장
              </button>
            </div>
          }
        >
          {t.openCount > 0 || t.strayCount > 0 ? (
            <div className="mb-3">
              <Notice tone="error">
                퇴근 기록이 빠진 근무 {t.openCount}건, 출근 기록이 빠진 퇴근 {t.strayCount}건이 있습니다. 해당 직원의 월간 기록부에서 확인해 정정해 주세요. 정정 전의 근무시간은 실제보다 적게 계산됩니다.
              </Notice>
            </div>
          ) : null}
          {summary.rows.length === 0 ? (
            <p className="text-sm text-muted">이 달에 표시할 직원이 없습니다. PIN을 만든 직원이나 이 달 기록이 있는 직원이 나옵니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">직원</th>
                    <th className="py-2 pr-4 text-right font-semibold">근무일</th>
                    <th className="py-2 pr-4 text-right font-semibold">실제 근무</th>
                    <th className="py-2 pr-4 text-right font-semibold">약정 근무</th>
                    <th className="py-2 pr-4 text-right font-semibold">차이</th>
                    <th className="py-2 pr-4 text-right font-semibold">참고용 예상 임금</th>
                    <th className="py-2 font-semibold">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary">
                  {summary.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-4 font-semibold">
                        <Link href={`/admin/clock/sheet?id=${r.id}&month=${month}`} className="text-primary underline underline-offset-2">
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{r.workedDays}일</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{fmtMin(r.workedMin)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{r.scheduledMin == null ? "-" : fmtMin(r.scheduledMin)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{r.diffMin == null ? "-" : `${r.diffMin > 0 ? "+" : ""}${fmtMin(r.diffMin)}`}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{r.payType === "monthly" ? "월급제" : r.pay == null ? "-" : `${r.pay.toLocaleString("ko-KR")}원`}</td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {r.openCount ? <Badge tone="warn">퇴근 없음 {r.openCount}</Badge> : null}
                          {r.strayCount ? <Badge tone="warn">출근 없는 퇴근 {r.strayCount}</Badge> : null}
                          {r.edited ? <Badge>정정 포함</Badge> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-secondary font-bold">
                    <td className="py-2.5 pr-4">합계</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{t.workedDays}일</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{fmtMin(t.workedMin)}</td>
                    <td className="py-2.5 pr-4 text-right">-</td>
                    <td className="py-2.5 pr-4 text-right">-</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{t.hasPay ? `${t.pay.toLocaleString("ko-KR")}원` : "-"}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">예상 임금은 시급제 직원의 기본시급 × 근무시간으로 계산한 참고 값입니다. 주휴·연장·야간·휴일 가산수당은 포함하지 않으며, 확정 급여는 노무사나 급여 프로그램으로 확인해 주세요.</p>
        </Panel>
      ) : null}

      {html ? (
        <Panel title="저장될 문서 미리보기">
          <div className="overflow-x-auto">
            <div className="paper min-w-[640px]" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
