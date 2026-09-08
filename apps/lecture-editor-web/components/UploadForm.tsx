"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleUpload() {
    if (!file) return;
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/jobs");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      try {
        const data = JSON.parse(xhr.responseText);
        if (!data.success) {
          setError(data.error || "업로드에 실패했습니다.");
          return;
        }
        router.push(`/jobs/${data.job.id}`);
      } catch {
        setError("서버 응답을 처리하지 못했습니다.");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("업로드 중 네트워크 오류가 발생했습니다.");
    };
    xhr.send(formData);
  }

  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20 }}>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        style={{ display: "block", marginBottom: 12, fontSize: 14 }}
      />
      <button
        onClick={handleUpload}
        disabled={!file || progress !== null}
        style={{
          padding: "10px 20px",
          background: !file || progress !== null ? "#94a3b8" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: !file || progress !== null ? "default" : "pointer",
        }}
      >
        {progress !== null ? `업로드 중... ${progress}%` : "업로드 시작"}
      </button>
      {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  );
}
