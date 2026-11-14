"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ContractPaper } from "@/components/contract/ContractPaper";
import { fmtKST, type ContractConfig, type InsForm } from "@/lib/contract";
import { adminApi } from "@/lib/contract/client/api";
import { Badge, Field, Notice, Panel, btnDanger, btnPrimary, inputCls } from "./ui";
import { SignatureSetter } from "./SignatureSetter";

interface Submission {
  id: string;
  configToken: string;
  configSnapshot: ContractConfig;
  name: string;
  phone: string;
  address: string;
  sig: string;
  signedAt: string;
  insForm: InsForm | null;
  ownerSig: string | null;
  countersignedAt: string | null;
  editedAt: string | null;
}
interface Res {
  submission: Submission;
  ownerSigned: boolean;
}

/** 제출된 계약서 한 건: 서명 당시 스냅샷으로 계약서를 보여 주고, 근로자 정보 수정·사업주 서명·삭제를 한다. */
export function SubmissionDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Res | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sig, setSig] = useState("");

  function apply(r: Res) {
    setData(r);
    setName(r.submission.name);
    setPhone(r.submission.phone);
    setAddress(r.submission.address);
  }

  useEffect(() => {
    let alive = true;
    void adminApi<Res>(`/api/admin/submissions/${id}`).then((r) => {
      if (!alive) return;
      if (r.ok) apply(r);
      else setLoadError(r.status === 404 ? "제출 내역을 찾을 수 없습니다. 삭제되었을 수 있습니다." : r.error);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loadError) return <Notice tone="error">{loadError}</Notice>;
  if (!data) return <p className="text-sm text-muted">불러오는 중입니다...</p>;
  const s = data.submission;

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFieldErr({});
    setError("");
    setMsg("");
    const r = await adminApi<{ submission: Submission }>(`/api/admin/submissions/${id}`, { method: "PATCH", body: { name, phone, address } });
    setBusy(false);
    if (r.ok) {
      apply({ submission: r.submission, ownerSigned: data!.ownerSigned });
      setMsg("근로자 정보를 수정했습니다. 서명과 계약 조건은 바뀌지 않았습니다.");
    } else {
      setFieldErr(r.fields ?? {});
      setError(r.error);
    }
  }

  async function countersign() {
    if (busy || !sig) return;
    setBusy(true);
    setError("");
    setMsg("");
    const r = await adminApi<{ submission: Submission }>(`/api/admin/submissions/${id}/countersign`, { method: "POST", body: { ownerSig: sig } });
    setBusy(false);
    if (r.ok) {
      apply({ submission: r.submission, ownerSigned: true });
      setSig("");
      setMsg("사업주 서명을 마쳤습니다. 계약이 확정되었습니다.");
    } else {
      setError(r.error);
    }
  }

  async function remove() {
    if (!window.confirm(`"${s.name}" 님의 제출 계약서를 삭제할까요?\n삭제하면 서명과 개인정보가 모두 지워지며 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    const r = await adminApi<object>(`/api/admin/submissions/${id}`, { method: "DELETE" });
    if (r.ok) router.replace("/admin/submissions");
    else {
      setBusy(false);
      setError(r.error);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/submissions" className="text-xs font-semibold text-primary hover:underline">
            ← 제출 현황
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{s.name} 님 계약서</h1>
          <p className="mt-1 text-xs text-muted">직원 서명 {fmtKST(s.signedAt)}</p>
        </div>
        <Badge tone={data.ownerSigned ? "ok" : "warn"}>{data.ownerSigned ? "확정" : "사업주 서명 대기"}</Badge>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {msg ? <Notice tone="ok">{msg}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="max-h-[80vh] overflow-auto rounded-lg">
          <ContractPaper
            config={s.configSnapshot}
            data={{
              name: s.name,
              phone: s.phone,
              address: s.address,
              sig: s.sig,
              ownerSig: s.ownerSig ?? undefined,
              signedAt: s.signedAt,
              countersignedAt: s.countersignedAt,
              insForm: s.insForm,
            }}
          />
        </div>

        <div className="space-y-5 lg:sticky lg:top-4">
          {!data.ownerSigned ? (
            <Panel title="사업주 서명">
              <p className="mb-3 text-xs leading-relaxed text-muted">공통 설정에 서명이 없어 직접 서명이 필요합니다. 서명하면 계약이 확정됩니다.</p>
              <SignatureSetter label="서명" value={sig} onChange={setSig} />
              <div className="mt-3 flex justify-end">
                <button type="button" className={btnPrimary} disabled={!sig || busy} onClick={countersign}>
                  사업주 서명 완료
                </button>
              </div>
            </Panel>
          ) : null}

          <Panel title="근로자 정보 수정">
            <form onSubmit={saveInfo} className="space-y-3" noValidate>
              <Field id="d-name" label="성명" error={fieldErr.name}>
                <input id="d-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
              </Field>
              <Field id="d-phone" label="연락처" error={fieldErr.phone}>
                <input id="d-phone" className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
              </Field>
              <Field id="d-addr" label="주소" error={fieldErr.address}>
                <input id="d-addr" className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
              </Field>
              <p className="text-xs leading-relaxed text-muted">오타를 고치는 용도입니다. 서명과 계약 조건은 서명 후에는 바꿀 수 없습니다.</p>
              <div className="flex justify-end">
                <button type="submit" className={btnPrimary} disabled={busy}>
                  정보 저장
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="삭제">
            <p className="mb-3 text-xs leading-relaxed text-muted">서명 이미지와 연락처·주소 등 개인정보가 모두 지워집니다. 보관이 필요하면 삭제하기 전에 저장해 두세요.</p>
            <button type="button" className={btnDanger} onClick={remove} disabled={busy}>
              이 제출 삭제
            </button>
          </Panel>
        </div>
      </div>
    </div>
  );
}
