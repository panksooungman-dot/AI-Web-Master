"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { StatusMessage } from "@/components/developer/StatusMessage";
import { ToastStack, type ToastMessage, type ToastTone } from "@/components/developer/Toast";

const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".webp"];

// 저장소 전체에 첨부파일 최대 크기 정책이 아직 없다(검색 결과 없음, 2026-07-21 확인) — Supabase
// Storage 업로드가 실제로 구현되면 그때 정해지는 정책 값으로 교체한다. 그 전까지의 임시 기본값.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-blue-500";

interface StagedFile {
  id: string;
  file: File;
}

interface InquiryFormState {
  title: string;
  contactName: string;
  companyName: string;
}

let toastSeq = 0;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function NewInquiryPage() {
  const router = useRouter();

  const [form, setForm] = useState<InquiryFormState>({ title: "", contactName: "", companyName: "" });
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState<"draft" | "analyze" | null>(null);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function pushToast(tone: ToastTone, text: string) {
    toastSeq += 1;
    const id = toastSeq;
    setToasts((prev) => [...prev, { id, tone, text }]);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function updateForm(key: keyof InquiryFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function isAcceptedFile(file: File): boolean {
    const lower = file.name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const accepted: StagedFile[] = [];
    const rejected: string[] = [];

    for (const file of incoming) {
      if (!isAcceptedFile(file)) {
        rejected.push(`${file.name} (지원하지 않는 형식)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(`${file.name} (파일 크기 초과)`);
        continue;
      }
      accepted.push({ id: `${file.name}-${file.lastModified}-${file.size}`, file });
    }

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
    }
    if (rejected.length > 0) {
      pushToast("error", `업로드할 수 없는 파일: ${rejected.join(", ")}`);
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      addFiles(event.target.files);
    }
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  /** 임시 저장은 초안이라 검증하지 않는다 — 검증은 실제 제출 개념인 AI 분석 시작에만 적용. */
  function validateForAnalysis(): boolean {
    const nextErrors: { title?: string; content?: string } = {};
    if (!form.title.trim()) nextErrors.title = "문의 제목을 입력해주세요.";
    if (!content.trim() && files.length === 0) {
      nextErrors.content = "문의 내용 또는 첨부파일 중 하나는 필수입니다.";
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      pushToast("error", nextErrors.title ?? nextErrors.content ?? "입력값을 확인해주세요.");
      return false;
    }
    return true;
  }

  function handleSaveDraft() {
    if (loading) return;
    setLoading("draft");

    // TODO: Draft 저장소가 아직 없다 — lib/inquiries/registry.ts는 접수 완료된(source:
    // "chatbot"|"manual") 레코드만 다루고, InquiryStatus에도 "Draft" 상태가 없다. Draft 개념이
    // 확정되면 여기서 실제 저장 API를 호출하도록 교체한다.
    console.log("[inquiries/new] 임시 저장", {
      form,
      content,
      files: files.map((f) => f.file.name),
    });

    pushToast("success", "임시 저장되었습니다.");
    setLoading(null);
  }

  function handleAnalyze() {
    if (loading) return;
    if (!validateForAnalysis()) return;

    setLoading("analyze");

    // TODO(AI 분석 파이프라인 — 현재는 OpenAI를 실제로 호출하지 않는다):
    // 1. Supabase Storage 업로드 — files를 스토리지에 업로드하고 URL 확보
    // 2. 파일 OCR — 업로드된 PDF/이미지에서 텍스트 추출
    // 3. OpenAI 분석 — content + OCR 결과 기반 분석 실행. 이미 존재하는
    //    lib/ai-analysis/analysis.ts의 generateAnalysis()가 POST /api/external/inquiries에서
    //    쓰이는 동일 목적의 함수이므로, 수동 등록 경로도 결국 이 함수로 합류시키는 것이 맞다.
    // 4. 요구사항 문서 생성
    // 5. 기능 목록 생성
    // 6. 스토리보드 생성
    // 7. WBS 생성
    // 8. 프로젝트 생성 — lib/inquiries/registry.ts의 createInquiry() +
    //    lib/clients/registry.ts의 findOrCreateClientByEmail() +
    //    lib/websiteOrders/registry.ts의 createWebsiteOrder() +
    //    lib/aiJobs/registry.ts의 createAiJob() 재사용(POST /api/external/inquiries와 동일 흐름)
    console.log("[inquiries/new] AI 분석 시작", {
      form,
      content,
      files: files.map((f) => ({ name: f.file.name, size: f.file.size, type: f.file.type })),
    });

    pushToast("success", "AI 분석 요청이 접수되었습니다. (현재는 콘솔 로그로만 확인 가능합니다)");
    setLoading(null);
  }

  function handleCancel() {
    router.push("/developer/inquiries");
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/developer/inquiries" className="hover:text-white transition-colors">
          AI 의뢰 관리
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-200">새 문의 등록</span>
      </div>

      <PageHeader
        icon="✨"
        title="새 문의 등록"
        description="고객 상담 내용 또는 제안서를 등록하면 AI가 자동으로 요구사항 문서를 생성합니다."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="문의 정보" className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">문의 제목 *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateForm("title", e.target.value)}
                placeholder="예) 스마트공장 홈페이지 제작"
                className={inputClass}
              />
              {errors.title && (
                <StatusMessage tone="error" className="mt-1">
                  {errors.title}
                </StatusMessage>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">고객명</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => updateForm("contactName", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">회사명</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => updateForm("companyName", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">문의 내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"고객 상담 내용을 붙여넣으세요.\n카카오톡, 메일, 전화 상담, 미팅 내용 모두 가능합니다."}
                className={`${inputClass} min-h-[300px] resize-y`}
              />
              {errors.content && (
                <StatusMessage tone="error" className="mt-1">
                  {errors.content}
                </StatusMessage>
              )}
            </div>
          </div>
        </Card>

        <Card title="첨부파일" className="lg:col-span-1">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragOver ? "border-blue-500 bg-blue-500/5" : "border-gray-700 bg-gray-950"
            }`}
          >
            <p className="text-sm text-gray-400 mb-3">파일을 드래그해서 놓거나</p>
            <label className="inline-block cursor-pointer rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm font-semibold transition-colors">
              파일 선택
              <input
                type="file"
                multiple
                accept={ACCEPTED_EXTENSIONS.join(",")}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-600 mt-3">PDF · DOC · DOCX · TXT · PNG · JPG · JPEG · WEBP</p>
          </div>

          {files.length > 0 && (
            <ul className="flex flex-col gap-2 mt-4">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
                >
                  <span className="truncate text-gray-200">{f.file.name}</span>
                  <span className="shrink-0 text-xs text-gray-500">{formatFileSize(f.file.size)}</span>
                  <button
                    onClick={() => removeFile(f.id)}
                    aria-label={`${f.file.name} 삭제`}
                    className="shrink-0 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap justify-end gap-2 mt-6">
        <button
          onClick={handleCancel}
          className="rounded bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-semibold transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={loading !== null}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading === "draft" ? "저장 중..." : "임시 저장"}
        </button>
        <button
          onClick={handleAnalyze}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <SparklesIcon />
          {loading === "analyze" ? "분석 요청 중..." : "AI 분석 시작"}
        </button>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l.6 1.6L7 17l-1.4.4L5 19l-.6-1.6L3 17l1.4-.4L5 15z" />
    </svg>
  );
}
