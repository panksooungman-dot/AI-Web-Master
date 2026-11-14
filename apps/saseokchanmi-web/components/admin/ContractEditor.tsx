"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ContractPaper } from "@/components/contract/ContractPaper";
import {
  DAYS,
  GLOBAL_KEYS,
  TYPE_DEF,
  TYPE_NAME,
  allOff,
  buildConfig,
  koDateToIso,
  wageCalcSummary,
  DEFAULT_MIN_WAGE,
  type CompanySettings,
  type ContractConfig,
  type EmploymentType,
  type InsKey,
  type SchedDay,
} from "@/lib/contract";
import { INSK } from "@/lib/contract";
import { adminApi } from "@/lib/contract/client/api";
import { Badge, Field, Notice, Panel, btnOutline, btnPrimary, inputCls, statusTone } from "./ui";

interface SettingsRes {
  company: CompanySettings;
  minWage: number;
}
interface ConfigRes {
  config: ContractConfig;
  status: string;
  statusLabel: string;
  submissionId: string | null;
}

const TYPES: EmploymentType[] = ["hourly", "monthly", "parttime"];
const TYPE_HINT: Record<EmploymentType, string> = {
  hourly: "시간당 급여로 계산하는 직원",
  monthly: "매달 정해진 월급을 받는 직원",
  parttime: "요일마다 근무시간이 다른 단시간 직원",
};

/** 서버에는 공통 설정 항목을 빼고 이 직원의 값만 보낸다. */
function workerPayload(form: ContractConfig): Record<string, unknown> {
  const out: Record<string, unknown> = { ...form };
  for (const k of GLOBAL_KEYS) delete out[k];
  return out;
}

const digits = (v: string) => v.replace(/\D/g, "");
const isoOf = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : koDateToIso(v));

export function ContractEditor({ token: initialToken }: { token?: string }) {
  const [token, setToken] = useState(initialToken ?? "");
  const [form, setForm] = useState<ContractConfig | null>(null);
  const [minWage, setMinWage] = useState(DEFAULT_MIN_WAGE);
  const [status, setStatus] = useState<{ key: string; label: string; submissionId: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saved, setSaved] = useState("");
  const [loadError, setLoadError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await adminApi<SettingsRes>("/api/admin/settings");
      if (!alive) return;
      if (!s.ok) return setLoadError(s.error);
      setMinWage(s.minWage);
      if (!initialToken) return setForm(buildConfig(s.company, { type: "hourly" }));
      const c = await adminApi<ConfigRes>(`/api/admin/configs/${initialToken}`);
      if (!alive) return;
      if (!c.ok) return setLoadError(c.status === 404 ? "직원 계약을 찾을 수 없습니다. 삭제되었을 수 있습니다." : c.error);
      setForm(c.config);
      setStatus({ key: c.status, label: c.statusLabel, submissionId: c.submissionId });
    })();
    return () => {
      alive = false;
    };
  }, [initialToken]);

  const wage = useMemo(() => (form ? wageCalcSummary(form, minWage) : null), [form, minWage]);

  if (loadError) return <Notice tone="error">{loadError}</Notice>;
  if (!form) return <p className="text-sm text-muted">불러오는 중입니다...</p>;
  const f = form;

  const up = (patch: Partial<ContractConfig>) => {
    setForm({ ...f, ...patch });
    setSaved("");
  };
  const pickType = (type: EmploymentType) => {
    if (type === f.type) return;
    // 고용형태를 바꾸면 그 형태의 기본값(임금 방식, 근무표 사용 여부 등)으로 맞춘다. 입력한 이름·날짜·임금 금액은 유지한다.
    setForm({ ...f, ...structuredClone(TYPE_DEF[type]), ...(type === "parttime" ? { sched: allOff() } : {}) } as ContractConfig);
    setSaved("");
  };
  const setDay = (i: number, patch: Partial<SchedDay>) => {
    const sched = f.sched.map((d, j) => (j === i ? { ...d, ...patch } : d));
    up({ sched });
  };
  const setDayType = (i: number, t: SchedDay["t"]) =>
    setDay(i, t === "work" ? { t, s: f.sched[i].s || "09:00", e: f.sched[i].e || "18:00", bs: f.sched[i].bs, be: f.sched[i].be } : { t, s: "", e: "", bs: "", be: "" });

  async function save() {
    if (busy) return;
    setBusy(true);
    setErrors([]);
    setWarnings([]);
    setSaved("");
    const r = token
      ? await adminApi<{ config: ContractConfig; warnings: string[] }>(`/api/admin/configs/${token}`, { method: "PATCH", body: workerPayload(f) })
      : await adminApi<{ token: string; warnings: string[] }>("/api/admin/configs", { method: "POST", body: workerPayload(f) });
    setBusy(false);
    if (!r.ok) {
      setErrors(r.errors?.length ? r.errors : [r.error]);
      return;
    }
    setWarnings(r.warnings);
    if (!token && "token" in r) {
      setToken(r.token);
      window.history.replaceState(null, "", `/admin/contracts/${r.token}`);
      setStatus({ key: "unsubmitted", label: "미제출", submissionId: null });
      setSaved("직원 계약을 만들었습니다. 아래 링크를 직원에게 보내 주세요.");
    } else {
      setSaved("저장했습니다.");
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/contract/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("아래 링크를 복사해 주세요.", url);
    }
  }

  const isMonthly = f.type === "monthly";
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/contract/${token}` : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin" className="text-xs font-semibold text-primary hover:underline">
            ← 직원 계약 목록
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{token ? "직원 계약 수정" : "직원 계약 만들기"}</h1>
        </div>
        {status ? <Badge tone={statusTone(status.key)}>{status.label}</Badge> : null}
      </div>

      {status?.submissionId ? (
        <Notice tone="info">
          이미 직원이 제출한 계약입니다. 여기서 조건을 고쳐도 <b>제출된 계약서는 서명 당시 내용 그대로</b> 유지됩니다.{" "}
          <Link href={`/admin/submissions/${status.submissionId}`} className="font-semibold text-primary underline">
            제출된 계약서 보기
          </Link>
        </Notice>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel title="기본 정보">
            <div className="space-y-4">
              <Field id="c-label" label="직원 이름 (관리용 메모)" hint="계약서에는 나오지 않고, 목록에서 구분하는 데만 씁니다. 실제 성명은 직원이 직접 입력합니다.">
                <input id="c-label" className={inputCls} value={f.label} onChange={(e) => up({ label: e.target.value })} maxLength={40} />
              </Field>
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-foreground">고용형태</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={f.type === t}
                      onClick={() => pickType(t)}
                      className={`rounded-lg border px-3 py-2.5 text-left transition ${f.type === t ? "border-primary bg-primary text-white" : "border-secondary bg-white text-foreground hover:bg-secondary/40"}`}
                    >
                      <span className="block text-sm font-bold">{TYPE_NAME[t]}</span>
                      <span className={`block text-xs ${f.type === t ? "text-white/85" : "text-muted"}`}>{TYPE_HINT[t]}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="c-date" label="계약 작성일" hint="비워 두면 계약서에 빈칸으로 나옵니다.">
                  <input id="c-date" type="date" className={inputCls} value={isoOf(f.date)} onChange={(e) => up({ date: e.target.value })} />
                </Field>
                <Field id="c-start" label="근로 개시일">
                  <input id="c-start" type="date" className={inputCls} value={isoOf(f.start)} onChange={(e) => up({ start: e.target.value })} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="c-term" label="계약 기간">
                  <select id="c-term" className={inputCls} value={f.termType} onChange={(e) => up({ termType: e.target.value as ContractConfig["termType"] })}>
                    <option value="open">기간의 정함이 없음</option>
                    <option value="fixed">기간을 정함</option>
                  </select>
                </Field>
                {f.termType === "fixed" ? (
                  <Field id="c-end" label="계약 종료일">
                    <input id="c-end" type="date" className={inputCls} value={isoOf(f.end)} onChange={(e) => up({ end: e.target.value })} />
                  </Field>
                ) : null}
              </div>
              <Field id="c-duty" label="업무 내용">
                <input id="c-duty" className={inputCls} value={f.duty} onChange={(e) => up({ duty: e.target.value })} maxLength={100} />
              </Field>
            </div>
          </Panel>

          <Panel title="근무 시간">
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
                <input type="checkbox" checked={f.useSched} onChange={(e) => up({ useSched: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                요일마다 근무시간이 달라요 (요일별 근무표 사용)
              </label>

              {f.useSched ? (
                <div className="space-y-2">
                  {f.sched.map((d, i) => (
                    <div key={DAYS[i]} className="rounded-lg border border-secondary p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="w-8 text-sm font-bold text-foreground">{DAYS[i]}</span>
                        <select aria-label={`${DAYS[i]}요일 구분`} className={`${inputCls} !w-auto`} value={d.t} onChange={(e) => setDayType(i, e.target.value as SchedDay["t"])}>
                          <option value="work">근무</option>
                          <option value="off">휴무</option>
                          <option value="week">주휴일</option>
                        </select>
                        {d.t === "work" ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                            <input aria-label={`${DAYS[i]}요일 출근`} type="time" className={`${inputCls} !w-auto`} value={d.s} onChange={(e) => setDay(i, { s: e.target.value })} />
                            ~
                            <input aria-label={`${DAYS[i]}요일 퇴근`} type="time" className={`${inputCls} !w-auto`} value={d.e} onChange={(e) => setDay(i, { e: e.target.value })} />
                            <span className="ml-1">휴게</span>
                            <input aria-label={`${DAYS[i]}요일 휴게 시작`} type="time" className={`${inputCls} !w-auto`} value={d.bs} onChange={(e) => setDay(i, { bs: e.target.value })} />
                            ~
                            <input aria-label={`${DAYS[i]}요일 휴게 끝`} type="time" className={`${inputCls} !w-auto`} value={d.be} onChange={(e) => setDay(i, { be: e.target.value })} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="c-ws" label="출근 시각">
                    <input id="c-ws" type="time" className={inputCls} value={f.workS} onChange={(e) => up({ workS: e.target.value })} />
                  </Field>
                  <Field id="c-we" label="퇴근 시각">
                    <input id="c-we" type="time" className={inputCls} value={f.workE} onChange={(e) => up({ workE: e.target.value })} />
                  </Field>
                  <Field id="c-bs" label="휴게 시작">
                    <input id="c-bs" type="time" className={inputCls} value={f.brkS} onChange={(e) => up({ brkS: e.target.value })} />
                  </Field>
                  <Field id="c-be" label="휴게 끝">
                    <input id="c-be" type="time" className={inputCls} value={f.brkE} onChange={(e) => up({ brkE: e.target.value })} />
                  </Field>
                  <Field id="c-days" label="매주 근무일 수">
                    <select id="c-days" className={inputCls} value={f.days} onChange={(e) => up({ days: e.target.value })}>
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={String(n)}>
                          주 {n}일
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <Field id="c-brknote" label="휴게시간 추가 안내 (선택)">
                <input id="c-brknote" className={inputCls} value={f.brkNote} onChange={(e) => up({ brkNote: e.target.value })} maxLength={300} />
              </Field>
              <Field id="c-wr1" label="근무일·주휴일 안내 (선택)">
                <input id="c-wr1" className={inputCls} value={f.weekRule} onChange={(e) => up({ weekRule: e.target.value })} maxLength={300} />
              </Field>
              <Field id="c-wr2" label="근무표 통보 안내 (선택)">
                <input id="c-wr2" className={inputCls} value={f.weekRule2} onChange={(e) => up({ weekRule2: e.target.value })} maxLength={300} />
              </Field>
            </div>
          </Panel>

          <Panel title="임금">
            <div className="space-y-4">
              {isMonthly ? (
                <>
                  <Field id="c-base" label="월 기본급 (원)">
                    <input id="c-base" className={inputCls} inputMode="numeric" value={f.basePay} onChange={(e) => up({ basePay: digits(e.target.value) })} maxLength={10} />
                  </Field>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-foreground">고정 수당 (선택, 최대 3개)</legend>
                    {f.allow.map((a, i) => (
                      <div key={i} className="grid grid-cols-[1fr_8rem] gap-2">
                        <input
                          aria-label={`수당 ${i + 1} 이름`}
                          placeholder="수당 이름 (예: 식대)"
                          className={inputCls}
                          value={a.n}
                          maxLength={30}
                          onChange={(e) => up({ allow: f.allow.map((x, j) => (j === i ? { ...x, n: e.target.value } : x)) })}
                        />
                        <input
                          aria-label={`수당 ${i + 1} 금액`}
                          placeholder="금액(원)"
                          inputMode="numeric"
                          className={inputCls}
                          value={a.a}
                          maxLength={10}
                          onChange={(e) => up({ allow: f.allow.map((x, j) => (j === i ? { ...x, a: digits(e.target.value) } : x)) })}
                        />
                      </div>
                    ))}
                  </fieldset>
                </>
              ) : (
                <>
                  <Field id="c-wage" label="시급 (원)">
                    <input id="c-wage" className={inputCls} inputMode="numeric" value={f.wage} onChange={(e) => up({ wage: digits(e.target.value) })} maxLength={9} />
                  </Field>
                  <Field id="c-hol" label="주휴수당">
                    <select id="c-hol" className={inputCls} value={f.holiday} onChange={(e) => up({ holiday: e.target.value as ContractConfig["holiday"] })}>
                      <option value="separate">별도로 표기 (주 15시간 이상이면 계산해 적음)</option>
                      <option value="none">별도 표기 안 함</option>
                    </select>
                  </Field>
                </>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="c-bonus" label="상여금">
                  <select id="c-bonus" className={inputCls} value={f.bonus} onChange={(e) => up({ bonus: e.target.value as ContractConfig["bonus"] })}>
                    <option value="none">없음</option>
                    <option value="has">있음</option>
                  </select>
                </Field>
                {f.bonus === "has" ? (
                  <Field id="c-bonusamt" label="상여금 금액 (원)">
                    <input id="c-bonusamt" className={inputCls} inputMode="numeric" value={f.bonusAmt} onChange={(e) => up({ bonusAmt: digits(e.target.value) })} maxLength={10} />
                  </Field>
                ) : null}
                <Field id="c-other" label="기타 급여(제수당 등)">
                  <select id="c-other" className={inputCls} value={f.other} onChange={(e) => up({ other: e.target.value as ContractConfig["other"] })}>
                    <option value="none">없음</option>
                    <option value="has">있음</option>
                  </select>
                </Field>
                {f.other === "has" ? (
                  <Field id="c-othertext" label="기타 급여 내용">
                    <input id="c-othertext" className={inputCls} value={f.otherText} onChange={(e) => up({ otherText: e.target.value })} maxLength={300} />
                  </Field>
                ) : null}
                <Field id="c-payday" label="임금지급일" hint="매월 몇 일인지 (협의 전이면 비워 둘 수 있습니다)">
                  <input id="c-payday" className={inputCls} inputMode="numeric" value={f.payDay} onChange={(e) => up({ payDay: digits(e.target.value) })} maxLength={2} />
                </Field>
                <Field id="c-paymethod" label="지급 방법">
                  <select id="c-paymethod" className={inputCls} value={f.payMethod} onChange={(e) => up({ payMethod: e.target.value as ContractConfig["payMethod"] })}>
                    <option value="">선택 안 함</option>
                    <option value="direct">근로자에게 직접 지급</option>
                    <option value="bank">근로자 명의 예금통장에 입금</option>
                  </select>
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title="4대 사회보험">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {INSK.map(([k, name]) => (
                  <Field key={k} id={`c-ins-${k}`} label={name}>
                    <select id={`c-ins-${k}`} className={inputCls} value={f.ins[k as InsKey]} onChange={(e) => up({ ins: { ...f.ins, [k]: e.target.value as "y" | "n" } })}>
                      <option value="y">가입 (적용)</option>
                      <option value="n">미적용</option>
                    </select>
                  </Field>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted">
                미적용으로 두면 직원이 계약서를 확인한 뒤 &lsquo;사회보험 미적용 사유서&rsquo;를 함께 작성합니다. 가입은 법령상 의무이므로 법정 제외 사유가 있을 때만 미적용으로 설정하세요.
              </p>
              <Field id="c-insnote" label="사회보험 추가 안내 (선택)">
                <input id="c-insnote" className={inputCls} value={f.insNote} onChange={(e) => up({ insNote: e.target.value })} maxLength={300} />
              </Field>
            </div>
          </Panel>

          <Panel title="특약">
            <Field id="c-extra" label="기타 특약 (한 줄에 하나씩)" hint="계약서 마지막에 항목으로 들어갑니다. 비워 두면 표시되지 않습니다.">
              <textarea id="c-extra" rows={4} className={inputCls} value={f.extra} onChange={(e) => up({ extra: e.target.value })} maxLength={2000} />
            </Field>
          </Panel>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-4">
          {wage ? (
            <Panel title="임금 계산 (참고용)">
              {wage.ready ? (
                <dl className="space-y-2 text-sm">
                  {wage.rows.map((row) => (
                    <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <dt className="text-muted">{row.label}</dt>
                      <dd className="font-semibold tabular-nums text-foreground">
                        {row.value}
                        {row.note ? <span className="ml-2 text-xs font-normal text-muted">{row.note}</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted">{wage.message}</p>
              )}
              {wage.warning ? (
                <div className="mt-3">
                  <Notice tone="error">{wage.warning}</Notice>
                </div>
              ) : null}
              {wage.footnote ? <p className="mt-3 text-xs leading-relaxed text-muted">{wage.footnote}</p> : null}
            </Panel>
          ) : null}

          <Panel title="계약서 미리보기" aside={<span className="text-xs text-muted">입력하면 바로 반영됩니다</span>}>
            <div className="max-h-[70vh] overflow-auto rounded-lg">
              <ContractPaper config={f} />
            </div>
          </Panel>
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-4 space-y-3 border-t border-secondary bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        {errors.length > 0 ? (
          <Notice tone="error">
            <ul className="list-disc space-y-0.5 pl-5">
              {errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          </Notice>
        ) : null}
        {saved ? <Notice tone="ok">{saved}</Notice> : null}
        {warnings.length > 0 ? <Notice tone="info">{warnings.join(" ")}</Notice> : null}
        {link ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-secondary bg-white px-3 py-2">
            <span className="text-xs font-semibold text-muted">직원용 링크</span>
            <code className="min-w-0 flex-1 truncate text-xs text-foreground">{link}</code>
            <button type="button" className={btnOutline} onClick={copyLink}>
              {copied ? "복사됨" : "링크 복사"}
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/admin" className={btnOutline}>
            목록으로
          </Link>
          <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
            {busy ? "저장 중..." : token ? "변경사항 저장" : "직원 계약 만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}
