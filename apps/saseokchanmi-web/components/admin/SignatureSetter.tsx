"use client";

import { useState } from "react";
import { SignaturePad } from "@/components/contract/SignaturePad";
import { fileToSignaturePng } from "@/lib/contract/client/image";
import { Notice, btnOutline } from "./ui";

const CHECKER = {
  backgroundImage: "linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
  backgroundColor: "#fff",
} as const;

interface Props {
  /** 지금 지정된 서명(저장된 값 또는 방금 만든 값). 없으면 빈 문자열. */
  value: string;
  onChange: (dataUrl: string) => void;
  label: string;
}

/** 서명·도장을 "직접 그리기" 또는 "사진 올리기"로 만든다. 결과는 항상 배경이 투명한 PNG다. */
export function SignatureSetter({ value, onChange, label }: Props) {
  const [mode, setMode] = useState<"draw" | "photo">("draw");
  const [padKey, setPadKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await fileToSignaturePng(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지를 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-24 w-56 items-center justify-center rounded-lg border border-secondary" style={CHECKER}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- 사용자가 만든 data URL이라 next/image가 맞지 않는다
            <img src={value} alt={`등록된 ${label}`} className="max-h-20 max-w-[13rem] object-contain" />
          ) : (
            <span className="text-xs text-muted">등록된 {label} 없음</span>
          )}
        </div>
        {value ? (
          <button
            type="button"
            className={btnOutline}
            onClick={() => {
              onChange("");
              setPadKey((k) => k + 1);
            }}
          >
            {label} 삭제
          </button>
        ) : null}
      </div>

      <div role="tablist" aria-label={`${label} 등록 방법`} className="flex gap-1">
        {(
          [
            ["draw", "직접 그리기"],
            ["photo", "사진으로 등록"],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === k ? "bg-primary text-white" : "text-primary hover:bg-secondary/50"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {mode === "draw" ? (
        <SignaturePad label={label} resetKey={padKey} onChange={(u) => u && onChange(u)} />
      ) : (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            흰 종이에 {label}을 또렷하게 찍은 사진을 올리면, 흰 배경은 자동으로 투명하게 바뀝니다. 도장은 밝은 곳에서 정면으로 찍으면 가장 잘 나옵니다.
          </p>
          <input type="file" accept="image/*" onChange={onFile} disabled={busy} aria-label={`${label} 사진 선택`} className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
          {busy ? <p className="text-xs text-muted">사진을 처리하는 중입니다...</p> : null}
        </div>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
