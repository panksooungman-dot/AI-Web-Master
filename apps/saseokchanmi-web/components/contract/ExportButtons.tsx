"use client";

import { useState } from "react";
import { Notice, btnOutline, btnPrimary } from "@/components/admin/ui";
import { contractHTML, type ContractConfig, type ContractSubmissionView } from "@/lib/contract";
import { downloadImage, downloadPdf, safeFileName } from "@/lib/contract/client/export";

interface Props {
  config: ContractConfig;
  data: ContractSubmissionView;
  /** 근로자 성명(파일 이름에 쓴다) */
  name: string;
  /** 서명한 시각(ISO). 파일 이름의 날짜에 쓴다. */
  signedAt: string;
  className?: string;
}

const kstDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  } catch {
    return "";
  }
};

/** 서명한 계약서를 PDF 또는 이미지로 저장하는 버튼. 서명 당시 내용(스냅샷)으로 만든다. */
export function ExportButtons({ config, data, name, signedAt, className = "" }: Props) {
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);
  const [error, setError] = useState("");

  async function run(kind: "pdf" | "png") {
    if (busy) return;
    setBusy(kind);
    setError("");
    try {
      const html = contractHTML(data, config);
      const base = `근로계약서_${safeFileName(name)}_${kstDate(signedAt)}`;
      if (kind === "pdf") await downloadPdf(html, config.watermark !== false, `${base}.pdf`);
      else await downloadImage(html, config.watermark !== false, `${base}.png`);
    } catch {
      setError("파일을 만들지 못했습니다. 잠시 후 다시 시도하거나, 아래 인쇄 기능을 이용해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className={btnPrimary} onClick={() => run("pdf")} disabled={busy !== null}>
          {busy === "pdf" ? "PDF 만드는 중..." : "PDF로 저장"}
        </button>
        <button type="button" className={btnOutline} onClick={() => run("png")} disabled={busy !== null}>
          {busy === "png" ? "이미지 만드는 중..." : "이미지로 저장"}
        </button>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
