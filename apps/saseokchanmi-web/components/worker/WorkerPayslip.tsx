"use client";

import { useMemo, useState } from "react";
import "@/lib/contract/paper.css";
import { Field, Notice, btnOutline, btnPrimary, inputCls } from "@/components/admin/ui";
import { publicApi } from "@/lib/contract/client/api";
import { downloadImage, downloadPdf, safeFileName } from "@/lib/contract/client/export";
import { monthLabel } from "@/lib/contract/clock-sheet";
import { payslipHTML } from "@/lib/contract/payroll";
import type { EmployeePayslip } from "@/lib/contract/server/payslip-view";

type Loaded = { name: string; payslips: EmployeePayslip[] };

/** 직원용 급여명세서 확인: 출퇴근 PIN 4자리로 본인 확인을 하면 확정된 명세서를 보고 PDF·이미지로 저장할 수 있다. */
export function WorkerPayslip({ id }: { id: string }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Loaded | null>(null);
  const [month, setMonth] = useState("");

  async function open(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return setError("PIN 숫자 4자리를 입력해 주세요.");
    setBusy(true);
    setError("");
    const r = await publicApi<Loaded>("/api/payslip", { method: "POST", body: { id, pin } });
    setBusy(false);
    setPin("");
    if (!r.ok) return setError(r.error);
    setData({ name: r.name, payslips: r.payslips });
    setMonth(r.payslips[0]?.month ?? "");
  }

  const slip = data?.payslips.find((p) => p.month === month) ?? null;
  const html = useMemo(() => (slip ? payslipHTML(slip.statement, { biz: slip.biz, owner: slip.owner, name: slip.employeeName, employeeNo: slip.employeeNo, payDate: slip.payDate, revision: slip.revision }) : ""), [slip]);

  async function save(kind: "pdf" | "png") {
    if (!slip) return;
    setBusy(true);
    setError("");
    try {
      const name = `${safeFileName(`급여명세서_${slip.employeeName}_${slip.month}`)}.${kind}`;
      if (kind === "pdf") await downloadPdf(html, false, name);
      else await downloadImage(html, false, name);
    } catch {
      setError("파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <form onSubmit={open} className="space-y-5 rounded-2xl border border-secondary bg-white p-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">급여명세서 확인</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">본인 확인을 위해 출퇴근 기록에 쓰는 PIN 숫자 4자리를 입력해 주세요. PIN을 모르면 사장님께 문의해 주세요.</p>
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Field id="payslip-pin" label="PIN 4자리">
          <input id="payslip-pin" className={inputCls} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </Field>
        <button type="submit" className={btnPrimary} disabled={busy || pin.length !== 4}>
          {busy ? "확인 중..." : "명세서 보기"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{data.name}님의 급여명세서</h1>
        <p className="mt-1 text-sm text-muted">사장님이 확정한 명세서만 표시됩니다. 금액 문의는 매장으로 해 주세요.</p>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {data.payslips.length === 0 ? (
        <Notice tone="info">아직 확정된 급여명세서가 없습니다.</Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {data.payslips.map((p) => (
              <button key={p.month} type="button" className={p.month === month ? btnPrimary : btnOutline} onClick={() => setMonth(p.month)}>
                {monthLabel(p.month)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => save("pdf")}>
              PDF로 저장
            </button>
            <button type="button" className={btnOutline} disabled={busy} onClick={() => save("png")}>
              이미지로 저장
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-secondary bg-white">
            <div className="paper min-w-[640px]" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </>
      )}
    </div>
  );
}
