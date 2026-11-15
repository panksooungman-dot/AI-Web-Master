"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/contract/client/api";
import { isMonth, monthLabel, toKstLocal } from "@/lib/contract/clock-sheet";
import { won } from "@/lib/contract/format";
import { payrollCsv, type PayrollRates } from "@/lib/contract/payroll";
import type { PayslipRecord } from "@/lib/contract/server/store";
import { Badge, btnOutline, btnPrimary, Field, inputCls, Notice, Panel } from "./ui";

type Row = { id: string; name: string; status: "confirmed" | "draft"; gross: number; net: number; blocking: number; revision: number; payDate: string; payslip: PayslipRecord | null };
type Data = { month: string; rows: Row[]; rates: PayrollRates; deductBreak: boolean };
const nowKstMonth = () => toKstLocal(new Date().toISOString()).slice(0, 7);

const RATE_FIELDS: { key: keyof PayrollRates; label: string; hint: string }[] = [
  { key: "pension", label: "국민연금 (%)", hint: "근로자 부담률" },
  { key: "health", label: "건강보험 (%)", hint: "근로자 부담률" },
  { key: "ltc", label: "장기요양보험 (%)", hint: "건강보험료 대비 비율" },
  { key: "employment", label: "고용보험 (%)", hint: "근로자 부담률" },
  { key: "localTax", label: "지방소득세 (%)", hint: "소득세 대비 비율" },
];

/** 급여: 월을 고르면 직원별 급여 현황, 공제율 설정, 급여대장(CSV). 명세서는 직원을 눌러 작성·확정한다. */
export function PayrollOverview({ initialMonth }: { initialMonth?: string }) {
  const [month, setMonth] = useState(isMonth(initialMonth) ? initialMonth : nowKstMonth());
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [rates, setRates] = useState<Record<keyof PayrollRates, string>>({ pension: "", health: "", ltc: "", employment: "", localTax: "" });
  const [deductBreak, setDeductBreak] = useState(true);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isMonth(month)) return;
    setError("");
    const r = await adminApi<Data>(`/api/admin/payroll/overview?month=${month}`);
    if (r.ok) {
      setData(r);
      setRates(Object.fromEntries(Object.entries(r.rates).map(([k, v]) => [k, String(v)])) as Record<keyof PayrollRates, string>);
      setDeductBreak(r.deductBreak);
    } else {
      setData(null);
      setError(r.error);
    }
  }, [month]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function saveSettings() {
    const parsed: Partial<PayrollRates> = {};
    for (const f of RATE_FIELDS) {
      const raw = rates[f.key].trim();
      const v = raw === "" ? 0 : Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > 100) return setNotice({ tone: "error", text: `${f.label}은 0 이상 100 이하의 숫자로 입력해 주세요.` });
      parsed[f.key] = v;
    }
    setSaving(true);
    const r = await adminApi("/api/admin/payroll/settings", { method: "PUT", body: { rates: parsed, deductBreak } });
    setSaving(false);
    if (!r.ok) return setNotice({ tone: "error", text: r.error });
    setNotice({ tone: "ok", text: "급여 설정을 저장했습니다. 이미 확정된 명세서는 바뀌지 않고, 앞으로 계산하는 급여부터 적용됩니다." });
    void load();
  }

  function downloadCsv() {
    const list = (data?.rows ?? []).flatMap((r) => (r.payslip ? [{ name: r.name, month: r.payslip.month, payDate: r.payslip.payDate, revision: r.payslip.revision, statement: r.payslip.statement }] : []));
    const blob = new Blob(["﻿" + payrollCsv(list)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `급여대장_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  const rows = data?.rows ?? [];
  const confirmed = rows.filter((r) => r.status === "confirmed");
  const sum = (f: (r: Row) => number) => rows.reduce((t, r) => t + f(r), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">급여</h1>
        <p className="mt-1 text-sm text-muted">출퇴근 기록과 계약서로 한 달 급여를 계산하고, 확인한 뒤 확정해서 임금명세서(PDF)를 만듭니다.</p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Panel title="귀속 월">
        <div className="flex flex-wrap items-end gap-3">
          <Field id="pay-month" label="월">
            <input id="pay-month" type="month" className={inputCls} value={month} onChange={(e) => isMonth(e.target.value) && setMonth(e.target.value)} />
          </Field>
          <p className="pb-2.5 text-sm text-muted">{monthLabel(month)} 급여 · 확정 {confirmed.length}/{rows.length}명</p>
        </div>
      </Panel>

      <Panel
        title={`직원별 급여 · ${rows.length}명`}
        aside={
          <button type="button" className={btnOutline} disabled={confirmed.length === 0} onClick={downloadCsv}>
            급여대장(CSV) 내려받기
          </button>
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted">사업주 서명까지 끝나 확정된 계약의 직원이 아직 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 pr-4 font-semibold">직원</th>
                  <th className="py-2 pr-4 font-semibold">상태</th>
                  <th className="py-2 pr-4 text-right font-semibold">총지급액</th>
                  <th className="py-2 pr-4 text-right font-semibold">실수령액</th>
                  <th className="py-2 font-semibold">명세서</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-4 font-semibold">{r.name}</td>
                    <td className="py-2.5 pr-4">
                      {r.status === "confirmed" ? <Badge tone="ok">{`확정${r.revision > 1 ? ` (${r.revision}차)` : ""}`}</Badge> : <Badge tone="warn">미확정</Badge>}
                      {r.blocking ? <span className="ml-2 text-xs text-red-700">확인 필요 {r.blocking}건</span> : null}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{won(r.gross)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{won(r.net)}</td>
                    <td className="py-2.5">
                      <Link href={`/admin/payroll/slip?id=${r.id}&month=${month}`} className={btnOutline}>
                        {r.status === "confirmed" ? "명세서 보기" : "작성·확정"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-secondary font-bold">
                  <td className="py-2.5 pr-4">합계</td>
                  <td />
                  <td className="py-2.5 pr-4 text-right tabular-nums">{won(sum((r) => r.gross))}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{won(sum((r) => r.net))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">미확정 직원의 금액은 지금 기록으로 계산한 예상 값입니다. 직원별 화면에서 확인·조정한 뒤 확정하면 그 금액이 저장됩니다.</p>
      </Panel>

      <Panel title="급여 계산 기준">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>상시 근로자 5인 미만 사업장 기준이라 연장·야간·휴일 가산수당은 계산하지 않습니다.</li>
          <li>시급제는 &lsquo;시급 × 실제 근무시간&rsquo;이고, 계약서에서 주휴수당을 별도로 지급하며 요일별 근무표가 있으면 개근한 주마다 주휴수당을 더합니다. 월급제는 계약서의 월급을 그대로 씁니다.</li>
          <li>4대보험은 아래에서 설정한 공제율로만 계산하며, 계약서에서 미적용으로 표시한 보험은 공제하지 않습니다. 소득세는 직접 입력합니다.</li>
          <li>이 계산은 급여 정리를 돕는 도구입니다. 확정 급여는 노무사나 급여 프로그램으로 한 번 더 확인해 주세요.</li>
        </ul>
      </Panel>

      <Panel title="급여 설정 (공제율)">
        <div className="space-y-4">
          {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
          <p className="text-sm text-muted">공제율은 사업주가 직접 입력한 값으로만 계산합니다(비워 두거나 0이면 그 항목은 계산하지 않습니다). 공단에서 받은 고지 금액이 있으면 직원별 화면에서 금액을 직접 입력할 수 있습니다. 10원 미만은 절사합니다.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {RATE_FIELDS.map((f) => (
              <Field key={f.key} id={`rate-${f.key}`} label={f.label} hint={f.hint}>
                <input id={`rate-${f.key}`} className={inputCls} inputMode="decimal" value={rates[f.key]} onChange={(e) => setRates((r) => ({ ...r, [f.key]: e.target.value.replace(/[^\d.]/g, "") }))} />
              </Field>
            ))}
          </div>
          <label htmlFor="deduct-break" className="flex items-center gap-2 text-sm text-foreground">
            <input id="deduct-break" type="checkbox" checked={deductBreak} onChange={(e) => setDeductBreak(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            계약서의 휴게시간을 근무시간에서 자동으로 뺍니다
          </label>
          <button type="button" className={btnPrimary} disabled={saving} onClick={saveSettings}>
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </Panel>
    </div>
  );
}
