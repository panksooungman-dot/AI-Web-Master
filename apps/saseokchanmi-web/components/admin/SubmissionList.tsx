"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TYPE_NAME, fmtKST, type EmploymentType } from "@/lib/contract";
import { adminApi } from "@/lib/contract/client/api";
import { Badge, Notice, btnOutline } from "./ui";

interface Item {
  id: string;
  label: string;
  name: string;
  phone: string;
  type: EmploymentType;
  signedAt: string;
  ownerSigned: boolean;
  hasInsForm: boolean;
  editedAt: string | null;
}

/** 직원이 제출한 계약서 목록. 사업주 서명이 필요한 건을 먼저 보여 준다. */
export function SubmissionList() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void adminApi<{ items: Item[] }>("/api/admin/submissions").then((r) => {
      if (!alive) return;
      if (r.ok) setItems([...r.items].sort((a, b) => Number(a.ownerSigned) - Number(b.ownerSigned) || b.signedAt.localeCompare(a.signedAt)));
      else setError(r.error);
    });
    return () => {
      alive = false;
    };
  }, []);

  const waiting = items?.filter((i) => !i.ownerSigned).length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">제출 현황</h1>
        <p className="mt-1 text-sm text-muted">직원이 서명해서 제출한 계약서입니다. 제출된 계약서는 서명 당시 내용 그대로 보관됩니다.</p>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {waiting > 0 ? <Notice tone="info">사업주 서명이 필요한 계약서가 {waiting}건 있습니다.</Notice> : null}
      {items === null && !error ? <p className="text-sm text-muted">불러오는 중입니다...</p> : null}
      {items && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/40 bg-white p-8 text-center text-sm text-muted">아직 제출된 계약서가 없습니다.</div>
      ) : null}
      {items && items.length > 0 ? (
        <ul className="divide-y divide-secondary overflow-hidden rounded-xl border border-secondary bg-white">
          {items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-foreground">{it.name}</span>
                  <Badge>{TYPE_NAME[it.type] ?? it.type}</Badge>
                  <Badge tone={it.ownerSigned ? "ok" : "warn"}>{it.ownerSigned ? "확정" : "사업주 서명 대기"}</Badge>
                  {it.hasInsForm ? <Badge>사유서 포함</Badge> : null}
                </div>
                <p className="text-xs text-muted">
                  {it.phone} · 제출 {fmtKST(it.signedAt)}
                  {it.label ? ` · 관리용 이름 ${it.label}` : ""}
                  {it.editedAt ? " · 정보 수정됨" : ""}
                </p>
              </div>
              <Link href={`/admin/submissions/${it.id}`} className={btnOutline}>
                계약서 열기
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
