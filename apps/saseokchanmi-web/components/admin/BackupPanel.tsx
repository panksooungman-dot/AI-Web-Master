"use client";

import { useState } from "react";
import { btnPrimary, Notice, Panel } from "./ui";

/** 전체 데이터 백업 내려받기. 개인정보가 들어 있으므로 안내를 함께 보여 준다. */
export function BackupPanel() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function download() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/backup", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setNotice({ tone: "error", text: data?.error ?? "백업을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." });
        return;
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "saseokchanmi-backup.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setNotice({ tone: "ok", text: `${name} 파일을 내려받았습니다. 안전한 곳에 보관해 주세요.` });
    } catch {
      setNotice({ tone: "error", text: "네트워크 오류가 발생했습니다. 연결을 확인해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="전체 데이터 백업">
      <div className="space-y-3 text-sm leading-relaxed text-foreground">
        <p>직원 계약 설정, 공통 설정, 제출된 계약서(서명 포함), 출퇴근 기록과 정정 이력을 한 파일(JSON)로 내려받습니다. 월말이나 큰 변경 전에 받아 두면 좋습니다.</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>파일에는 근로자의 성명·연락처·주소·서명 이미지가 들어 있습니다. 개인 컴퓨터나 암호화된 저장소에만 보관하고, 메신저·메일로 보내지 마세요.</li>
          <li>출퇴근 PIN과 로그인 시도 기록은 담기지 않습니다. 복구가 필요하면 PIN은 새로 만들면 됩니다.</li>
          <li>보관 기간이 지난 근로자 자료는 파일에서도 파기해 주세요.</li>
        </ul>
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
        <button type="button" className={btnPrimary} disabled={busy} onClick={download}>
          {busy ? "만드는 중..." : "백업 파일 내려받기"}
        </button>
      </div>
    </Panel>
  );
}
