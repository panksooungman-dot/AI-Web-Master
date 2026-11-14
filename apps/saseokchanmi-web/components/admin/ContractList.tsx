"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TYPE_NAME, fmtKST, type EmploymentType } from "@/lib/contract";
import { adminApi } from "@/lib/contract/client/api";
import { Badge, Notice, btnDanger, btnOutline, btnPrimary, statusTone } from "./ui";

interface Item {
  token: string;
  label: string;
  type: EmploymentType;
  createdAt: string;
  status: string;
  statusLabel: string;
  submissionId: string | null;
  warnings: string[];
}

/** 직원 계약 목록: 상태 확인, 근로자용 링크 복사, 수정, 삭제. */
export function ContractList() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await adminApi<{ items: Item[] }>("/api/admin/configs");
    if (r.ok) {
      setItems(r.items);
      setError("");
    } else {
      setError(r.error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 화면을 열 때 목록을 불러온다
    void load();
  }, [load]);

  async function copyLink(token: string) {
    const url = `${window.location.origin}/contract/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg("근로자용 링크를 복사했습니다. 카카오톡 등으로 보내 주세요.");
    } catch {
      window.prompt("아래 링크를 복사해 주세요.", url);
    }
  }

  async function remove(it: Item) {
    const extra = it.submissionId ? "\n이미 제출된 계약서는 제출 현황에 그대로 남습니다." : "\n직원이 이 링크로 접속하던 중이라면 더는 열리지 않습니다.";
    if (!window.confirm(`"${it.label || "이름 없음"}" 직원 계약을 삭제할까요?${extra}`)) return;
    const r = await adminApi<object>(`/api/admin/configs/${it.token}`, { method: "DELETE" });
    if (r.ok) {
      setMsg("삭제했습니다.");
      void load();
    } else {
      setError(r.error);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">직원 계약</h1>
          <p className="mt-1 text-sm text-muted">직원마다 계약 조건을 만들고, 만들어진 링크를 직원에게 보내면 직원이 직접 확인하고 서명합니다.</p>
        </div>
        <Link href="/admin/contracts/new" className={btnPrimary}>
          직원 계약 만들기
        </Link>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {msg ? <Notice tone="ok">{msg}</Notice> : null}

      {items === null && !error ? <p className="text-sm text-muted">불러오는 중입니다...</p> : null}
      {items && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/40 bg-white p-8 text-center text-sm text-muted">
          아직 만든 직원 계약이 없습니다. 오른쪽 위 &lsquo;직원 계약 만들기&rsquo;로 시작해 보세요.
        </div>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="divide-y divide-secondary overflow-hidden rounded-xl border border-secondary bg-white">
          {items.map((it) => (
            <li key={it.token} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-foreground">{it.label || "이름 없음"}</span>
                  <Badge>{TYPE_NAME[it.type] ?? it.type}</Badge>
                  <Badge tone={statusTone(it.status)}>{it.statusLabel}</Badge>
                </div>
                <p className="text-xs text-muted">만든 날짜 {fmtKST(it.createdAt)}</p>
                {it.warnings.length > 0 ? <p className="text-xs text-amber-800">{it.warnings[0]}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnOutline} onClick={() => copyLink(it.token)}>
                  링크 복사
                </button>
                <Link href={`/admin/contracts/${it.token}`} className={btnOutline}>
                  열기·수정
                </Link>
                {it.submissionId ? (
                  <Link href={`/admin/submissions/${it.submissionId}`} className={btnOutline}>
                    제출본 보기
                  </Link>
                ) : null}
                <button type="button" className={btnDanger} onClick={() => remove(it)}>
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
