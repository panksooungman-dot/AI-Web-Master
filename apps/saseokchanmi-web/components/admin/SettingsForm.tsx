"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MIN_WAGE, MIN_WAGE_YEAR, type CompanySettings } from "@/lib/contract";
import { adminApi } from "@/lib/contract/client/api";
import { Field, Notice, Panel, btnPrimary, inputCls } from "./ui";
import { SignatureSetter } from "./SignatureSetter";

type Loaded = { company: CompanySettings; minWage: number };

/** 공통 설정: 모든 직원 계약서에 똑같이 들어가는 사업주 정보와 서명, 최저시급. */
export function SettingsForm() {
  const [loaded, setLoaded] = useState(false);
  const [biz, setBiz] = useState("");
  const [owner, setOwner] = useState("");
  const [tel, setTel] = useState("");
  const [addr, setAddr] = useState("");
  const [watermark, setWatermark] = useState(true);
  const [minWage, setMinWage] = useState(String(DEFAULT_MIN_WAGE));
  const [ownerSig, setOwnerSig] = useState("");
  const [sigDirty, setSigDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    let alive = true;
    void adminApi<Loaded>("/api/admin/settings").then((r) => {
      if (!alive) return;
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setBiz(r.company.biz);
      setOwner(r.company.owner);
      setTel(r.company.tel);
      setAddr(r.company.addr);
      setWatermark(r.company.watermark !== false);
      setOwnerSig(r.company.ownerSig ?? "");
      setMinWage(String(r.minWage));
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved("");
    const body: Record<string, unknown> = { biz, owner, tel, addr, watermark, minWage: Number(minWage.replace(/\D/g, "")) };
    if (sigDirty) body.ownerSig = ownerSig;
    const r = await adminApi<{ company: CompanySettings }>("/api/admin/settings", { method: "PUT", body });
    setBusy(false);
    if (r.ok) {
      setSigDirty(false);
      setSaved("저장했습니다. 앞으로 만드는 계약서와, 이후 근로자가 서명하는 계약서에 적용됩니다.");
    } else {
      setError(r.errors?.length ? r.errors.join(" / ") : r.error);
    }
  }

  if (!loaded && !error) return <p className="text-sm text-muted">불러오는 중입니다...</p>;

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-bold text-foreground">공통 설정</h1>
        <p className="mt-1 text-sm text-muted">모든 직원 계약서에 똑같이 들어가는 내용입니다. 한 번만 정리해 두면 됩니다.</p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="ok">{saved}</Notice> : null}

      <Panel title="사업주 정보">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="s-biz" label="사업장명">
            <input id="s-biz" className={inputCls} value={biz} onChange={(e) => setBiz(e.target.value)} maxLength={100} />
          </Field>
          <Field id="s-owner" label="대표자">
            <input id="s-owner" className={inputCls} value={owner} onChange={(e) => setOwner(e.target.value)} maxLength={100} />
          </Field>
          <Field id="s-tel" label="전화번호">
            <input id="s-tel" className={inputCls} value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" maxLength={100} />
          </Field>
          <Field id="s-addr" label="사업장 주소">
            <input id="s-addr" className={inputCls} value={addr} onChange={(e) => setAddr(e.target.value)} maxLength={100} />
          </Field>
        </div>
      </Panel>

      <Panel title="사업주 서명·도장">
        <p className="mb-3 text-sm leading-relaxed text-muted">
          서명이 등록되어 있으면 직원이 서명하는 즉시 계약이 <b>확정</b>됩니다. 등록하지 않으면 직원이 서명한 뒤 제출 현황에서 사업주가 따로 서명해야 합니다.
          서명 이미지는 서버에만 저장되며, 이미 제출된 계약서는 서명 당시의 모습 그대로 유지됩니다.
        </p>
        <SignatureSetter
          label="서명·도장"
          value={ownerSig}
          onChange={(u) => {
            setOwnerSig(u);
            setSigDirty(true);
          }}
        />
      </Panel>

      <Panel title="계약서 표시와 기준값">
        <div className="space-y-4">
          <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            계약서 배경에 로고 워터마크 넣기
          </label>
          <Field id="s-min" label={`최저시급 기준(원) — 기본 ${MIN_WAGE_YEAR}년 ${DEFAULT_MIN_WAGE.toLocaleString("ko-KR")}원`} hint="임금 계산 패널에서 시급이 이 값보다 낮으면 경고합니다. 해가 바뀌어 최저시급이 달라지면 여기만 고치면 됩니다.">
            <input id="s-min" className={inputCls} value={minWage} onChange={(e) => setMinWage(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={6} />
          </Field>
        </div>
      </Panel>

      <div className="flex justify-end">
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "저장 중..." : "공통 설정 저장"}
        </button>
      </div>
    </form>
  );
}
