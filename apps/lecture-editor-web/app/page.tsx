import Link from "next/link";
import { listJobs } from "@/lib/jobs/registry";
import UploadForm from "@/components/UploadForm";

const STATUS_LABEL: Record<string, string> = {
  queued: "대기 중",
  analyzing: "음성 분석 중",
  rendering: "렌더링 중",
  revising: "수정 반영 중",
  done: "완료",
  error: "오류",
};

export default async function HomePage() {
  const jobs = await listJobs();

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>강의영상 자동편집</h1>
      <p style={{ color: "#475569", fontSize: 14, marginBottom: 32 }}>
        촬영 원본을 올리면 자동으로 침묵/재촬영 컷 제거 + 설명 구간 줌인을 적용합니다.
      </p>

      <UploadForm />

      <h2 style={{ fontSize: 16, marginTop: 40, marginBottom: 12 }}>처리 이력</h2>
      {jobs.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: 14 }}>아직 업로드한 영상이 없습니다.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  marginBottom: 8,
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "#0f172a",
                }}
              >
                <span>{job.originalFilename}</span>
                <span style={{ color: job.status === "error" ? "#dc2626" : job.status === "done" ? "#16a34a" : "#2563eb" }}>
                  {STATUS_LABEL[job.status] ?? job.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
