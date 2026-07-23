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
  email: string;
}

let toastSeq = 0;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function NewInquiryPage() {
  const router = useRouter();

  const [form, setForm] = useState<InquiryFormState>({ title: "", contactName: "", companyName: "", email: "" });
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState<"draft" | "analyze" | null>(null);
  const [errors, setErrors] = useState<{ title?: string; content?: string; contactName?: string; email?: string }>({});
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

  /**
   * 임시 저장은 초안이라 검증하지 않는다 — 검증은 실제 제출 개념인 AI 분석 시작에만 적용.
   * contactName/email 체크는 AI Business OS Rewiring에서 추가됨 — POST /api/inquiries가
   * 요구하는 lib/inquiries/validate.ts의 validateInquiryInput() 필수값(담당자명·이메일)과
   * 동일한 기준을 제출 전에 미리 보여주기 위함(서버 검증 로직을 복제하지 않고 실패 사유만 미리
   * 안내하는 용도 — 최종 검증은 여전히 서버가 수행한다).
   */
  function validateForAnalysis(): boolean {
    const nextErrors: { title?: string; content?: string; contactName?: string; email?: string } = {};
    if (!form.title.trim()) nextErrors.title = "문의 제목을 입력해주세요.";
    if (!form.contactName.trim()) nextErrors.contactName = "고객명(담당자)을 입력해주세요.";
    if (!form.email.trim()) nextErrors.email = "이메일을 입력해주세요.";
    if (!content.trim() && files.length === 0) {
      nextErrors.content = "문의 내용 또는 첨부파일 중 하나는 필수입니다.";
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      pushToast(
        "error",
        nextErrors.title ?? nextErrors.contactName ?? nextErrors.email ?? nextErrors.content ?? "입력값을 확인해주세요.",
      );
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

  /**
   * AI Business OS Rewiring Phase 1 — POST /api/inquiries(내부, app/api/inquiries/route.ts)를
   * 호출해 createInquiry() 이하 기존 파이프라인(AI Analysis → Client → WebsiteOrder → AiJob)에
   * 합류시킨다. 이 라우트와 완전히 동일한 흐름을 cnbiz.kr의 공개 문의 폼(components/sections/
   * ContactForm.tsx)도 함께 사용한다 — "chatbot"이 아닌 "manual"을 source로 보내는 것만 다르다.
   *
   * 남은 TODO(파일 업로드 스토리지·OCR)는 이번 범위가 아니다 — Supabase Storage 업로드 백엔드가
   * 아직 없어 첨부파일은 실제 URL 없이 파일명만 rawPayload에 감사 목적으로 남긴다.
   */
  async function handleAnalyze() {
    if (loading) return;
    if (!validateForAnalysis()) return;

    setLoading("analyze");

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "manual",
          companyName: form.companyName,
          contactName: form.contactName,
          email: form.email,
          requirements: content,
          rawPayload: {
            title: form.title,
            // TODO: 실제 업로드 URL이 아니라 파일명만 감사 목적으로 보관 — Supabase Storage
            // 연동이 구현되면 lib/inquiries/types.ts의 uploadedFiles(URL 목록)로 옮긴다.
            uploadedFileNames: files.map((f) => f.file.name),
          },
        }),
      });
      const data: { success: boolean; inquiryId?: string; error?: string; errors?: Record<string, string> } =
        await res.json();

      if (!data.success) {
        pushToast("error", data.error ?? Object.values(data.errors ?? {})[0] ?? "문의 등록에 실패했습니다.");
        return;
      }

      pushToast("success", "문의가 등록되고 AI 분석이 시작되었습니다.");
      router.push(`/developer/inquiries/${data.inquiryId}`);
    } catch {
      pushToast("error", "문의 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
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
                <label className="block text-sm text-gray-400 mb-1">고객명(담당자) *</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => updateForm("contactName", e.target.value)}
                  className={inputClass}
                />
                {errors.contactName && (
                  <StatusMessage tone="error" className="mt-1">
                    {errors.contactName}
                  </StatusMessage>
                )}
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
              <label className="block text-sm text-gray-400 mb-1">이메일 *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="customer@example.com"
                className={inputClass}
              />
              {errors.email && (
                <StatusMessage tone="error" className="mt-1">
                  {errors.email}
                </StatusMessage>
              )}
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
