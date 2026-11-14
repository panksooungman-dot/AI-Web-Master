"use client";

import { useEffect, useRef, useState } from "react";
import { ContractPaper } from "@/components/contract/ContractPaper";
import { SignaturePad } from "@/components/contract/SignaturePad";
import { Field, Notice, btnOutline, btnPrimary, inputCls } from "@/components/admin/ui";
import {
  CONSENT_LABEL,
  INS_CONFIRM,
  INS_REASON,
  fmtKST,
  fmtPhone,
  insOff,
  privacyConsent,
  summarizeContract,
  validateInsForm,
  validateWorkerInfo,
  type ContractConfig,
  type InsForm,
  type WorkerInfoErrors,
} from "@/lib/contract";
import { publicApi } from "@/lib/contract/client/api";

type Load =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "submitted" }
  | { kind: "open"; config: ContractConfig; hasOwnerSig: boolean };

const STEPS = ["정보 입력", "내용 확인", "서명", "완료"] as const;
const emptyIns = (): InsForm => ({ r: {}, other: "", birth: "", detail: "", c: [false, false, false] });

/** 근로자용 계약 화면: 정보 입력 → 내용 확인 → 서명 → 완료. 로그인 없이 링크의 토큰으로만 접근한다. */
export function WorkerContract({ token }: { token: string }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [consent, setConsent] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [agree, setAgree] = useState(false);
  const [ins, setIns] = useState<InsForm>(emptyIns);
  const [sig, setSig] = useState("");
  const [fieldErr, setFieldErr] = useState<WorkerInfoErrors>({});
  const [stepError, setStepError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ signedAt: string; snapshot: ContractConfig } | null>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void publicApi<{ state: "open" | "submitted"; config?: ContractConfig; hasOwnerSig?: boolean }>(`/api/contract/${token}`).then((r) => {
      if (!alive) return;
      if (!r.ok) setLoad({ kind: "invalid", message: r.status === 404 ? "계약서 링크를 확인해 주세요." : r.error });
      else if (r.state === "submitted") setLoad({ kind: "submitted" });
      else setLoad({ kind: "open", config: r.config!, hasOwnerSig: !!r.hasOwnerSig });
    });
    return () => {
      alive = false;
    };
  }, [token]);

  const go = (n: number) => {
    setStep(n);
    setStepError("");
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: "start" }));
  };

  if (load.kind === "loading") return <p className="py-16 text-center text-sm text-muted">계약서를 불러오는 중입니다...</p>;
  if (load.kind === "invalid") {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-bold text-foreground">{load.message}</p>
        <p className="mt-2 text-sm text-muted">받으신 링크가 맞는지 확인하시고, 계속 열리지 않으면 사업주에게 문의해 주세요.</p>
      </div>
    );
  }
  if (load.kind === "submitted") {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-bold text-foreground">이미 제출된 계약서입니다.</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">한 번 제출한 계약서는 이 링크에서 다시 열거나 수정할 수 없습니다. 내용 확인이나 수정이 필요하면 사업주에게 문의해 주세요.</p>
      </div>
    );
  }

  const config = load.config;
  const off = insOff(config);
  const info = { name, phone, address };

  function next1() {
    const v = validateWorkerInfo(info);
    setFieldErr(v.errors);
    if (!v.ok) return;
    if (!consent) return setStepError("개인정보 수집·이용에 동의해 주세요.");
    go(2);
  }
  function next2() {
    if (!agree) return setStepError("계약서 내용을 읽었다는 항목에 체크해 주세요.");
    const msg = off.length ? validateInsForm(config, ins) : "";
    if (msg) return setStepError(msg);
    go(3);
  }
  async function submit() {
    if (busy) return;
    if (!sig) return setStepError("서명을 해 주세요.");
    setBusy(true);
    setStepError("");
    const r = await publicApi<{ signedAt: string; snapshot: ContractConfig }>(`/api/contract/${token}/submit`, {
      method: "POST",
      body: { name, phone, address, sig, ...(off.length ? { insForm: ins } : {}) },
    });
    setBusy(false);
    if (r.ok) {
      setDone({ signedAt: r.signedAt, snapshot: r.snapshot });
      go(4);
      return;
    }
    if (r.status === 409) return setLoad({ kind: "submitted" });
    if (r.fields) {
      setFieldErr(r.fields);
      go(1);
      return setStepError(r.error);
    }
    setStepError(r.error);
  }
  function printCopy() {
    document.body.classList.add("print-copy");
    window.addEventListener("afterprint", () => document.body.classList.remove("print-copy"), { once: true });
    window.print();
  }

  const view = { name, phone: phone ? fmtPhone(phone) : "", address, insForm: off.length ? ins : null };

  return (
    <div ref={top} className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-widest text-primary">{config.biz}</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">근로계약서</h1>
      </div>

      <ol className="grid grid-cols-4 gap-1.5" aria-label="진행 단계">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const on = n === step;
          return (
            <li key={label} aria-current={on ? "step" : undefined} className={`rounded-lg px-1 py-2 text-center text-xs font-semibold ${on ? "bg-primary text-white" : n < step ? "bg-secondary text-primary" : "bg-secondary/40 text-muted"}`}>
              <span className="block text-[10px] font-normal opacity-80">{n}단계</span>
              {label}
            </li>
          );
        })}
      </ol>

      {stepError ? <Notice tone="error">{stepError}</Notice> : null}

      {step === 1 ? (
        <section className="space-y-4" aria-labelledby="w-step1">
          <h2 id="w-step1" className="text-lg font-bold text-foreground">내 정보를 입력해 주세요</h2>
          <p className="text-sm leading-relaxed text-muted">계약 조건은 이미 정해져 있어 따로 적지 않으셔도 됩니다. 아래 세 가지만 입력해 주세요.</p>
          <Field id="w-name" label="성명" error={fieldErr.name}>
            <input id="w-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} />
          </Field>
          <Field id="w-phone" label="연락처" error={fieldErr.phone}>
            <input id="w-phone" className={inputCls} inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} maxLength={13} placeholder="010-0000-0000" />
          </Field>
          <Field id="w-addr" label="주소" error={fieldErr.address} hint="시/구/동까지 적어 주세요.">
            <input id="w-addr" className={inputCls} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
          </Field>

          <div className="rounded-lg border border-secondary bg-white p-4">
            <label className="flex items-start gap-3 text-sm font-semibold text-foreground">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
              {CONSENT_LABEL}
            </label>
            <button type="button" onClick={() => setShowConsent((v) => !v)} aria-expanded={showConsent} className="mt-2 text-xs font-semibold text-primary underline">
              {showConsent ? "내용 접기" : "내용 자세히 보기"}
            </button>
            {showConsent ? (
              <dl className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                {privacyConsent(config.biz).map((it) => (
                  <div key={it.title}>
                    <dt className="font-semibold text-foreground">{it.title}</dt>
                    <dd>{it.body}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          <button type="button" className={`${btnPrimary} w-full`} onClick={next1}>
            다음
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-5" aria-labelledby="w-step2">
          <h2 id="w-step2" className="text-lg font-bold text-foreground">계약 내용을 확인해 주세요</h2>
          <dl className="divide-y divide-secondary rounded-xl border border-secondary bg-white text-sm">
            {summarizeContract(config).map((row) => (
              <div key={row.label} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="shrink-0 text-muted">{row.label}</dt>
                <dd className="text-right font-semibold text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">계약서 전문</p>
            <div className="max-h-[60vh] overflow-auto rounded-lg">
              <ContractPaper config={config} data={view} />
            </div>
            {load.hasOwnerSig ? <p className="mt-2 text-xs text-muted">사업주 서명은 제출하신 뒤 완료본에 들어갑니다.</p> : null}
          </div>

          {off.length > 0 ? (
            <div className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div>
                <h3 className="text-base font-bold text-foreground">4대 사회보험 미적용 사유서</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">이 계약은 {off.map((x) => x[1]).join("·")}이(가) 미적용으로 되어 있어, 사유를 직접 선택해 작성해야 합니다. 작성한 내용은 위 계약서 뒤에 붙습니다.</p>
              </div>
              {off.map(([key, label]) => (
                <fieldset key={key} className="space-y-1.5">
                  <legend className="text-sm font-semibold text-foreground">{label} 미적용 사유</legend>
                  {Object.entries(INS_REASON).map(([n, text]) => (
                    <label key={n} className="flex items-start gap-2 text-sm text-foreground">
                      <input type="radio" name={`reason-${key}`} checked={ins.r[key] === n} onChange={() => setIns({ ...ins, r: { ...ins.r, [key]: n } })} className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]" />
                      <span>
                        {["", "①", "②", "③", "④"][+n]} {text}
                      </span>
                    </label>
                  ))}
                </fieldset>
              ))}
              {Object.values(ins.r).includes("4") ? (
                <Field id="w-other" label="기타 사유">
                  <input id="w-other" className={inputCls} value={ins.other} onChange={(e) => setIns({ ...ins, other: e.target.value })} maxLength={200} />
                </Field>
              ) : null}
              <Field id="w-birth" label="생년월일" hint="예: 900101 (숫자 6자리 이상). 주민등록번호 뒷자리는 입력하지 마세요.">
                <input id="w-birth" className={inputCls} inputMode="numeric" value={ins.birth} onChange={(e) => setIns({ ...ins, birth: e.target.value.replace(/\D/g, "").slice(0, 8) })} />
              </Field>
              <Field id="w-detail" label="구체적인 내용" hint="예: 주 12시간 근무, 다른 사업장에서 건강보험 가입 중 등">
                <textarea id="w-detail" rows={3} className={inputCls} value={ins.detail} onChange={(e) => setIns({ ...ins, detail: e.target.value })} maxLength={500} />
              </Field>
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-foreground">확인 사항 (모두 체크)</legend>
                {INS_CONFIRM.map((text, i) => (
                  <label key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                    <input type="checkbox" checked={!!ins.c[i]} onChange={(e) => setIns({ ...ins, c: [0, 1, 2].map((j) => (j === i ? e.target.checked : !!ins.c[j])) })} className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]" />
                    <span>{text}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          ) : null}

          <label className="flex items-start gap-3 rounded-lg border border-secondary bg-white p-4 text-sm font-semibold text-foreground">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
            계약서 내용을 읽었고 동의합니다.
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className={btnOutline} onClick={() => go(1)}>
              이전
            </button>
            <button type="button" className={btnPrimary} onClick={next2}>
              다음
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4" aria-labelledby="w-step3">
          <h2 id="w-step3" className="text-lg font-bold text-foreground">서명해 주세요</h2>
          <p className="text-sm leading-relaxed text-muted">아래 칸에 손가락으로 서명해 주세요. 서명하고 제출하면 계약서 내용에 동의한 것으로 처리되며, <b>제출 후에는 수정할 수 없습니다.</b></p>
          <SignaturePad label="서명" height={200} onChange={setSig} />
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className={btnOutline} onClick={() => go(2)} disabled={busy}>
              이전
            </button>
            <button type="button" className={btnPrimary} onClick={submit} disabled={busy || !sig}>
              {busy ? "제출 중..." : "서명하고 제출"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 && done ? (
        <section className="space-y-5" aria-labelledby="w-step4">
          <h2 id="w-step4" className="text-lg font-bold text-foreground">제출이 완료되었습니다</h2>
          <Notice tone="ok">
            {fmtKST(done.signedAt)}에 계약서가 저장되었습니다.{" "}
            {done.snapshot.ownerSig ? "사업주 서명까지 들어 있어 계약이 확정되었습니다." : "사업주가 확인하고 서명하면 계약이 확정됩니다."}
          </Notice>
          <Notice tone="info">이 화면을 벗어나면 이 링크에서는 계약서를 다시 볼 수 없습니다. 아래 버튼으로 사본을 꼭 저장해 두세요.</Notice>
          <div id="copy-area">
            <ContractPaper config={done.snapshot} data={{ ...view, sig, signedAt: done.signedAt }} />
          </div>
          <button type="button" className={`${btnPrimary} w-full`} onClick={printCopy}>
            사본 저장 (인쇄 화면에서 &lsquo;PDF로 저장&rsquo; 선택)
          </button>
        </section>
      ) : null}
    </div>
  );
}
