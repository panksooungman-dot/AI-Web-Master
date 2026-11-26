"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/contract/client/api";
import { DEFAULT_EXCLUDED } from "@/lib/contract/deposit";
import { Notice, Panel, btnOutline, btnPrimary, inputCls } from "./ui";

/** 입금 확인에서 제외할 입금자명 설정. 이름에 "카드"가 들어가면 항상 제외하고, 카드 정산 대행사 등 다른 이름은 여기에 추가한다. */
export function DepositExcludes() {
  const [names, setNames] = useState<string[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      const r = await adminApi<{ excludeNames: string[] }>("/api/admin/deposits/settings");
      if (r.ok) setNames(r.excludeNames);
      else setNotice({ tone: "error", text: r.error });
    });
  }, []);

  async function save(next: string[]) {
    setBusy(true);
    setNotice(null);
    const r = await adminApi<{ excludeNames: string[] }>("/api/admin/deposits/settings", { method: "PUT", body: { excludeNames: next } });
    setBusy(false);
    if (!r.ok) return setNotice({ tone: "error", text: r.error });
    setNames(r.excludeNames);
    setNotice({ tone: "ok", text: "저장했습니다. 앞으로 들어오는 입금부터 적용되고, 이미 제외된 입금은 되살릴 수 없습니다." });
  }

  function add() {
    const v = draft.replace(/\s+/g, " ").trim();
    if (!v || !names) return;
    setDraft("");
    if (!names.includes(v)) void save([...names, v]);
  }

  return (
    <Panel title="제외할 입금자명 (카드 정산 등)">
      <div className="space-y-3">
        <p className="text-sm text-muted">
          입금자명에 {DEFAULT_EXCLUDED.map((k) => `"${k}"`).join(", ")}가 들어 있으면 항상 제외합니다(삼성카드, 비씨카드 등). 카드 정산 대행사처럼 이름에 카드가 없는 입금은 아래에 이름의 일부를 추가해 주세요. 제외된 입금은 저장되지 않습니다.
        </p>
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
        <div className="flex flex-wrap gap-2">
          {(names ?? []).map((n) => (
            <span key={n} className="inline-flex items-center gap-2 rounded-full border border-secondary bg-secondary/30 px-3 py-1 text-sm">
              {n}
              <button type="button" aria-label={`${n} 제외 해제`} disabled={busy} className="text-muted hover:text-foreground" onClick={() => void save((names ?? []).filter((x) => x !== n))}>
                ×
              </button>
            </span>
          ))}
          {names && names.length === 0 ? <span className="text-sm text-muted">추가한 이름이 없습니다.</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <input aria-label="제외할 입금자명" className={`${inputCls} max-w-xs`} placeholder="예: 나이스정보통신" maxLength={30} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button type="button" className={names && draft.trim() ? btnPrimary : btnOutline} disabled={busy || !names || !draft.trim()} onClick={add}>
            추가
          </button>
        </div>
      </div>
    </Panel>
  );
}
