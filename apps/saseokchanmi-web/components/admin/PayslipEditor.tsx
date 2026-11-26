"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import "@/lib/contract/paper.css";
import { adminApi } from "@/lib/contract/client/api";
import { downloadImage, downloadPdf, safeFileName } from "@/lib/contract/client/export";
import { fmtMin, isMonth, monthLabel, type SheetEvent } from "@/lib/contract/clock-sheet";
import { won } from "@/lib/contract/format";
import { canConfirm, computePayroll, payslipHTML, type MoneyLine, type OverrideKey, type PayrollConfig, type PayrollInput, type PayrollRates } from "@/lib/contract/payroll";
import type { PayslipRecord } from "@/lib/contract/server/store";
import { Badge, btnOutline, btnPrimary, Field, inputCls, Notice, Panel } from "./ui";

type Bundle = {
  month: string;
  employee: { id: string; name: string; employeeNo: string };
  biz: string;
  owner: string;
  minWage: number;
  config: PayrollConfig;
  defaultPayDate: string;
  rates: PayrollRates;
  deductBreak: boolean;
  events: SheetEvent[];
  payslip: PayslipRecord | null;
};

interface Draft {
  payDate: string;
  earnings: { label: string; amount: string }[];
  deductions: { label: string; amount: string }[];
  override: Record<OverrideKey, string>;
  ack: boolean;
}

const OVERRIDES: { key: OverrideKey; label: string }[] = [
  { key: "pension", label: "국민연금" },
  { key: "health", label: "건강보험" },
  { key: "ltc", label: "장기요양보험" },
  { key: "employment", label: "고용보험" },
  { key: "incomeTax", label: "소득세" },
  { key: "localTax", label: "지방소득세" },
];

const digits = (s: string) => Number(s.replace(/\D/g, "")) || 0;
const emptyOverride = (): Record<OverrideKey, string> => ({ pension: "", health: "", ltc: "", employment: "", incomeTax: "", localTax: "" });

const draftOf = (input: PayrollInput | null, defaultPayDate: string): Draft =>
  input
    ? {
        payDate: input.payDate,
        earnings: input.extraEarnings.map((x) => ({ label: x.label, amount: String(x.amount) })),
        deductions: input.extraDeductions.map((x) => ({ label: x.label, amount: String(x.amount) })),
        override: { ...emptyOverride(), ...Object.fromEntries(Object.entries(input.override).map(([k, v]) => [k, String(v)])) },
        ack: false,
      }
    : { payDate: defaultPayDate, earnings: [], deductions: [], override: emptyOverride(), ack: false };

const inputOf = (d: Draft): PayrollInput => {
  const lines = (rows: Draft["earnings"]): MoneyLine[] => rows.map((r) => ({ label: r.label.trim(), amount: digits(r.amount) })).filter((r) => r.amount > 0);
  const override: Partial<Record<OverrideKey, number>> = {};
  for (const { key } of OVERRIDES) if (d.override[key].trim() !== "") override[key] = digits(d.override[key]);
  return { payDate: d.payDate, extraEarnings: lines(d.earnings), extraDeductions: lines(d.deductions), override, ack: d.ack };
};

function MoneyRows({ id, rows, onChange, addLabel }: { id: string; rows: Draft["earnings"]; onChange: (r: Draft["earnings"]) => void; addLabel: string }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input aria-label="항목 이름" className={`${inputCls} max-w-48`} placeholder="항목 이름" maxLength={30} value={r.label} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input id={`${id}-${i}`} aria-label="금액(원)" className={`${inputCls} max-w-40`} inputMode="numeric" placeholder="금액(원)" value={r.amount} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/\D/g, "") } : x)))} />
          <button type="button" className={btnOutline} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            삭제
          </button>
        </div>
      ))}
      {rows.length < 10 ? (
        <button type="button" className={btnOutline} onClick={() => onChange([...rows, { label: "", amount: "" }])}>
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

/** 직원 한 명의 급여명세서: 계산 결과 확인 → 조정 → 확정 → PDF. 확정한 명세서는 이후 기록을 고쳐도 바뀌지 않는다. */
export function PayslipEditor({ id, month }: { id: string; month: string }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !isMonth(month)) return setError("직원과 월을 확인해 주세요.");
    const r = await adminApi<Bundle>(`/api/admin/payroll/employee?id=${encodeURIComponent(id)}&month=${month}`);
    if (!r.ok) return setError(r.error);
    setBundle(r);
    setDraft(draftOf(r.payslip?.input ?? null, r.defaultPayDate));
    setMode(r.payslip ? "view" : "edit");
  }, [id, month]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const input = useMemo(() => (draft ? inputOf(draft) : null), [draft]);
  const statement = useMemo(
    () => (bundle && input ? computePayroll({ month, events: bundle.events, config: bundle.config, deductBreak: bundle.deductBreak, minWage: bundle.minWage, rates: bundle.rates, input }) : null),
    [bundle, input, month],
  );
  const stored = bundle?.payslip ?? null;
  const shown = mode === "view" && stored ? stored.statement : statement;
  const html = useMemo(() => {
    if (!bundle || !shown) return "";
    if (mode === "view" && stored) return payslipHTML(stored.statement, { biz: stored.biz, owner: stored.owner, name: stored.employeeName, employeeNo: stored.employeeNo, payDate: stored.payDate, revision: stored.revision });
    return payslipHTML(shown, { biz: bundle.biz, owner: bundle.owner, name: bundle.employee.name, employeeNo: bundle.employee.employeeNo, payDate: input?.payDate ?? "" });
  }, [bundle, shown, mode, stored, input]);

  async function sendKakao() {
    setBusy(true);
    setNotice(null);
    const r = await adminApi<{ linked?: boolean }>("/api/admin/payroll/notify", { method: "POST", body: { id, month } });
    setBusy(false);
    setNotice(r.ok ? { tone: "ok", text: r.linked ? "급여명세서 확인 링크를 알림톡으로 보냈습니다. 직원이 PIN 4자리로 직접 확인할 수 있습니다." : "급여명세서 확정 안내를 알림톡으로 보냈습니다. (확인 링크 알림톡이 아직 설정되지 않아 안내만 갔습니다)" } : { tone: "error", text: r.error });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/payslip/${id}`);
      setNotice({ tone: "ok", text: "직원 확인 링크를 복사했습니다. 직원은 이 링크에서 출퇴근 PIN 4자리로 본인 명세서를 확인합니다." });
    } catch {
      setNotice({ tone: "error", text: "링크를 복사하지 못했습니다. 직접 복사해 주세요: " + `${window.location.origin}/payslip/${id}` });
    }
  }

  async function confirm() {
    if (!draft || !input) return;
    setBusy(true);
    setNotice(null);
    const r = await adminApi<{ payslip: PayslipRecord }>("/api/admin/payroll/confirm", { method: "POST", body: { id, month, input } });
    setBusy(false);
    if (!r.ok) return setNotice({ tone: "error", text: r.error });
    setBundle((b) => (b ? { ...b, payslip: r.payslip } : b));
    setDraft(draftOf(r.payslip.input, bundle?.defaultPayDate ?? ""));
    setMode("view");
    setNotice({ tone: "ok", text: `${r.payslip.revision}차로 확정했습니다. 아래에서 PDF로 저장해 직원에게 전달하세요.` });
  }

  async function exportFile(kind: "pdf" | "png") {
    if (!stored) return;
    setBusy(true);
    try {
      const name = `${safeFileName(`급여명세서_${stored.employeeName}_${stored.month}`)}.${kind}`;
      if (kind === "pdf") await downloadPdf(html, false, name);
      else await downloadImage(html, false, name);
    } catch {
      setNotice({ tone: "error", text: "파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!bundle || !draft || !statement || !input) return <p className="text-sm text-muted">불러오는 중입니다...</p>;

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const warnings = statement.blocking;
  const ok = canConfirm(statement, input);
  const unlockHint = !input.payDate ? "임금 지급일을 입력해 주세요." : statement.errors[0] ?? (warnings.length && !input.ack ? "확인이 필요한 항목에 체크해 주세요." : "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {bundle.employee.name} · {monthLabel(month)} 급여명세서
          </h1>
          <p className="mt-1 text-sm text-muted">{bundle.employee.employeeNo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/clock/sheet?id=${id}&month=${month}`} className={btnOutline}>
            월간 기록부 보기
          </Link>
          <Link href={`/admin/payroll?month=${month}`} className={btnOutline}>
            ← 급여 현황
          </Link>
        </div>
      </div>

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {mode === "view" && stored ? (
        <>
          <Panel
            title="확정된 명세서"
            aside={
              <div className="flex items-center gap-2">
                <Badge tone="ok">{`${stored.revision}차 확정`}</Badge>
              </div>
            }
          >
            <div className="space-y-3 text-sm text-foreground">
              <p>
                확정 {new Date(stored.confirmedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 임금 지급일 {stored.payDate}. 이후 출퇴근 기록을 고쳐도 이 금액은 바뀌지 않습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} disabled={busy} onClick={() => exportFile("pdf")}>
                  PDF로 저장
                </button>
                <button type="button" className={btnOutline} disabled={busy} onClick={() => exportFile("png")}>
                  이미지로 저장
                </button>
                <button type="button" className={btnOutline} disabled={busy} onClick={sendKakao}>
                  직원에게 알림톡 보내기
                </button>
                <button type="button" className={btnOutline} onClick={copyLink}>
                  직원 확인 링크 복사
                </button>
                <button type="button" className={btnOutline} onClick={() => setMode("edit")}>
                  기록이 바뀌었나요? 다시 계산해 정정 발행
                </button>
              </div>
              {stored.history.length ? (
                <p className="text-xs text-muted">
                  이전 발행: {stored.history.map((h) => `${h.revision}차 총지급 ${won(h.gross)} / 실수령 ${won(h.net)}`).join(" · ")}
                </p>
              ) : null}
            </div>
          </Panel>
        </>
      ) : (
        <>
          {stored ? <Notice tone="info">이미 {stored.revision}차로 확정된 명세서가 있습니다. 아래에서 현재 기록으로 다시 계산해 확정하면 {stored.revision + 1}차로 발행되고, 이전 금액은 이력에 남습니다.</Notice> : null}

          {warnings.length ? (
            <Notice tone="error">
              <div className="space-y-2">
                <p className="font-semibold">확정 전에 확인이 필요합니다.</p>
                <ul className="list-disc space-y-1 pl-5">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                <p>월간 기록부에서 정정한 뒤 이 화면을 새로 고치거나, 그대로 두고 아래에서 확인했다고 표시할 수 있습니다.</p>
                <label htmlFor="ack" className="flex items-center gap-2 font-semibold">
                  <input id="ack" type="checkbox" checked={draft.ack} onChange={(e) => set({ ack: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                  위 내용을 확인했습니다
                </label>
              </div>
            </Notice>
          ) : null}
          {statement.errors.length ? <Notice tone="error">{statement.errors.join(" ")}</Notice> : null}

          <Panel title="계산 결과">
            <div className="space-y-4">
              <p className="text-sm text-muted">
                근무 {statement.work.workedDays}일 · 실제 근무 {fmtMin(statement.work.workedMin)}
                {statement.work.scheduledMin == null ? "" : ` (약정 ${fmtMin(statement.work.scheduledMin)})`}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-muted">
                    <tr>
                      <th className="py-2 pr-4 font-semibold">항목</th>
                      <th className="py-2 pr-4 text-right font-semibold">금액</th>
                      <th className="py-2 font-semibold">계산 방법</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary">
                    {statement.earnings.map((l) => (
                      <tr key={l.key}>
                        <td className="py-2 pr-4 font-semibold">{l.label}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{won(l.amount)}</td>
                        <td className="py-2 text-xs text-muted">{l.basis}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-2 pr-4">총지급액</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{won(statement.gross)}</td>
                      <td />
                    </tr>
                    {statement.deductions.map((l) => (
                      <tr key={l.key}>
                        <td className="py-2 pr-4">(−) {l.label}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{won(l.amount)}</td>
                        <td className="py-2 text-xs text-muted">{l.basis}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-2 pr-4">공제 합계</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{won(statement.deductionTotal)}</td>
                      <td />
                    </tr>
                    <tr className="text-base font-bold">
                      <td className="py-2.5 pr-4">실수령액</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{won(statement.net)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              {statement.notes.length ? (
                <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
                  {statement.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Panel>

          <Panel title="조정과 직접 입력">
            <div className="space-y-5">
              <Field id="pay-date" label="임금 지급일" hint={bundle.defaultPayDate ? "계약서의 급여일로 채웠습니다. 명세서에 꼭 들어가는 항목입니다." : "명세서에 꼭 들어가는 항목입니다."}>
                <input id="pay-date" type="date" className={`${inputCls} max-w-52`} value={draft.payDate} onChange={(e) => set({ payDate: e.target.value })} />
              </Field>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">기타 지급 (식대, 정정분 등)</p>
                <MoneyRows id="earn" rows={draft.earnings} onChange={(earnings) => set({ earnings })} addLabel="+ 지급 항목 추가" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">기타 공제 (가불 등)</p>
                <MoneyRows id="ded" rows={draft.deductions} onChange={(deductions) => set({ deductions })} addLabel="+ 공제 항목 추가" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">공제 금액 직접 입력</p>
                <p className="text-xs text-muted">공단 고지 금액이나 원천징수 금액을 알면 입력하세요. 비워 두면 설정한 공제율로 자동 계산합니다(소득세는 비워 두면 0원).</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {OVERRIDES.map((o) => (
                    <Field key={o.key} id={`ov-${o.key}`} label={`${o.label} (원)`}>
                      <input id={`ov-${o.key}`} className={inputCls} inputMode="numeric" value={draft.override[o.key]} onChange={(e) => set({ override: { ...draft.override, [o.key]: e.target.value.replace(/\D/g, "") } })} />
                    </Field>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={btnPrimary} disabled={!ok || busy} onClick={confirm}>
                  {busy ? "저장 중..." : stored ? `정정해서 ${stored.revision + 1}차로 확정` : "급여 확정"}
                </button>
                {stored ? (
                  <button type="button" className={btnOutline} onClick={() => setMode("view")}>
                    취소
                  </button>
                ) : null}
                {!ok && unlockHint ? <p className="text-sm text-muted">{unlockHint}</p> : null}
              </div>
            </div>
          </Panel>
        </>
      )}

      <Panel title={mode === "view" && stored ? "명세서 미리보기" : "명세서 미리보기 (확정 전)"}>
        <div className="overflow-x-auto">
          <div className="paper min-w-[640px]" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        {mode === "edit" ? <p className="mt-3 text-xs text-muted">확정하기 전에는 PDF로 저장할 수 없습니다. 금액을 확인하고 &lsquo;급여 확정&rsquo;을 누르세요.</p> : null}
      </Panel>
    </div>
  );
}
