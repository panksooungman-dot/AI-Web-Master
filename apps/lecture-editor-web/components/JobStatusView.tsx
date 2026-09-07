"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface JobRecord {
  id: string;
  originalFilename: string;
  status: "queued" | "analyzing" | "rendering" | "revising" | "done" | "error";
  reviewText?: string;
  finalPath?: string;
  error?: string;
  revisions: { instruction: string; appliedAt: string; summary: string }[];
  logs: { at: string; text: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  queued: "대기 중",
  analyzing: "음성 분석 중 (몇 분 걸릴 수 있습니다)",
  rendering: "영상 렌더링 중",
  revising: "수정 사항 반영 중",
  done: "완료",
  error: "오류 발생",
};

const IN_PROGRESS = new Set(["queued", "analyzing", "rendering", "revising"]);

export default function JobStatusView({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobRecord | null>(null);
  const [instruction, setInstruction] = useState("");
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [reviseSubmitting, setReviseSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 상태가 진행 중인 동안 3초마다 다시 조회한다. 완료/오류가 되면 스스로 멈춘다.
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.success) return;
      setJob(data.job);
      if (!IN_PROGRESS.has(data.job.status) && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch {
      // 네트워크 오류는 다음 인터벌에서 자동 재시도
    }
  }, [jobId]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchStatus();
    });
    timerRef.current = setInterval(fetchStatus, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchStatus]);

  async function submitRevision() {
    if (!instruction.trim()) return;
    setReviseSubmitting(true);
    setReviseError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/revise`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      const data = await res.json();
      if (!data.success) {
        setReviseError(data.error || "수정 요청에 실패했습니다.");
        return;
      }
      setInstruction("");
      if (!timerRef.current) {
        timerRef.current = setInterval(fetchStatus, 3000); // 폴링이 멈춰 있었다면 재개
      }
      fetchStatus();
    } catch {
      setReviseError("서버에 연결할 수 없습니다.");
    } finally {
      setReviseSubmitting(false);
    }
  }

  if (!job) {
    return <p>불러오는 중...</p>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{job.originalFilename}</h1>
      <p
        style={{
          fontSize: 14,
          color: job.status === "error" ? "#dc2626" : job.status === "done" ? "#16a34a" : "#2563eb",
          marginBottom: 20,
        }}
      >
        상태: {STATUS_LABEL[job.status] ?? job.status}
      </p>

      {job.status === "error" && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <p style={{ color: "#991b1b", fontSize: 14, whiteSpace: "pre-wrap" }}>{job.error}</p>
        </div>
      )}

      {job.status === "done" && job.finalPath && (
        <a
          href={`/api/jobs/${job.id}/download`}
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: "#16a34a",
            color: "white",
            borderRadius: 6,
            textDecoration: "none",
            marginBottom: 24,
          }}
        >
          완성 영상 다운로드
        </a>
      )}

      {job.reviewText && (
        <details style={{ marginBottom: 24 }} open={job.status === "done"}>
          <summary style={{ cursor: "pointer", fontSize: 14, color: "#334155", marginBottom: 8 }}>
            어디를 자르고 줌인했는지 확인 (검토표)
          </summary>
          <pre
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 16,
              fontSize: 12,
              whiteSpace: "pre-wrap",
              maxHeight: 400,
              overflowY: "auto",
            }}
          >
            {job.reviewText}
          </pre>
        </details>
      )}

      {job.status === "done" && (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>수정하고 싶은 부분이 있으면 말씀해주세요</p>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder='예) "3번 구간 자르지 말고 살려줘", "1번 구간 줌을 조금만 당겨줘"'
            rows={3}
            style={{ width: "100%", padding: 10, boxSizing: "border-box", fontSize: 14, marginBottom: 8 }}
          />
          <button
            onClick={submitRevision}
            disabled={reviseSubmitting || !instruction.trim()}
            style={{
              padding: "8px 16px",
              background: reviseSubmitting || !instruction.trim() ? "#94a3b8" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: reviseSubmitting || !instruction.trim() ? "default" : "pointer",
            }}
          >
            수정 요청
          </button>
          {reviseError && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{reviseError}</p>}
        </div>
      )}

      {job.revisions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: "#334155", marginBottom: 8 }}>수정 이력</p>
          <ul style={{ fontSize: 13, color: "#475569", paddingLeft: 20 }}>
            {job.revisions.map((r, i) => (
              <li key={i}>{r.instruction}</li>
            ))}
          </ul>
        </div>
      )}

      <details>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>처리 로그 보기</summary>
        <pre style={{ fontSize: 11, color: "#64748b", whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
          {job.logs.map((l) => `[${l.at}] ${l.text}`).join("\n")}
        </pre>
      </details>
    </div>
  );
}
