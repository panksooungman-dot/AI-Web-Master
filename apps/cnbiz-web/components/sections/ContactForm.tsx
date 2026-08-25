"use client";

import { useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { Button, Card, Input, Textarea } from "@cnbiz/ui";
import { Container, Section } from "@cnbiz/layout-primitives";
import { parseInquiryInput, validateInquiryInput, type InquiryValidationErrors } from "@/lib/inquiries/validate";
import { WEBSITE_TYPES } from "@/lib/websites/types";
import { componentMarker } from "@/lib/dev/component-marker";

interface FormState {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  siteType: string;
  requirements: string;
  budget: string;
  industry: string;
  brandColor: string;
  domain: string;
  /** 쉼표로 구분된 참고 사이트 URL 입력값 — 제출 시 referenceUrls(string[])로 분리된다. */
  referenceUrls: string;
  /** "무엇을 만들고 싶으신가요?" 단계 — 기존 siteType(웹사이트 빌더 전용 11개 목록, 다른
   *  화면에서도 재사용 중)과 별개의 상위 분류. survey에 담겨 전달된다. */
  serviceCategory: string;
}

const INITIAL_STATE: FormState = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  siteType: "",
  requirements: "",
  budget: "",
  industry: "",
  brandColor: "",
  domain: "",
  referenceUrls: "",
  serviceCategory: "",
};

const SERVICE_CATEGORIES = [
  { id: "shopping", label: "쇼핑몰" },
  { id: "website", label: "홈페이지" },
  { id: "erp", label: "ERP" },
  { id: "automation", label: "자동화프로그램" },
  { id: "other", label: "기타" },
];

/** 쇼핑몰·홈페이지에 한해 먼저 제공하는 기능 체크리스트. ERP·자동화프로그램·기타는 실제
 *  작업 방식이 사례마다 달라 항목을 임의로 만들지 않고, "문의 내용" 자유 텍스트로 받는다. */
const FEATURE_CHECKLISTS: Record<string, { id: string; label: string }[]> = {
  shopping: [
    { id: "catalog", label: "상품 카테고리 관리" },
    { id: "cart", label: "장바구니" },
    { id: "payment", label: "결제(카드·간편결제·계좌이체)" },
    { id: "shipping", label: "배송 조회" },
    { id: "returns", label: "반품/교환 처리" },
    { id: "membership", label: "회원가입/로그인" },
    { id: "reviews", label: "리뷰·평점" },
    { id: "coupons", label: "쿠폰/할인" },
    { id: "inventory", label: "재고 관리" },
    { id: "admin", label: "관리자 페이지" },
  ],
  website: [
    { id: "about", label: "회사소개" },
    { id: "services", label: "사업/서비스 소개" },
    { id: "portfolio", label: "포트폴리오/사례" },
    { id: "map", label: "오시는 길/지도" },
    { id: "contact", label: "문의하기 폼" },
    { id: "careers", label: "채용정보" },
    { id: "i18n", label: "다국어 지원" },
    { id: "news", label: "공지사항/뉴스" },
    { id: "social", label: "SNS 연동" },
    { id: "admin", label: "관리자 페이지(콘텐츠 수정)" },
  ],
};

type SubmitStatus = "idle" | "submitting" | "success" | "error";

interface StepConfig {
  /** InquiryInput 필드명과 일치하는 값이면 에러 매핑에 사용된다. 그룹 단계는 실제 필드가
   *  아닌 임의 문자열(예: "attachments")이라 검증 오류가 매핑되지 않는다(정상). */
  key: string;
  label: string;
  question: string;
  optional: boolean;
  tip: string;
  /** 값이 있으면 이 필드가 비어 있을 때 "다음"을 막는다. */
  requiredField?: keyof FormState;
}

// app/api/inquiries/upload/route.ts의 MAX_BINARY_BYTES와 동일 — 클라이언트에서 먼저 걸러
// 불필요한 업로드 요청을 막는다(서버가 최종 검증은 다시 한다).
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

interface StagedFile {
  id: string;
  file: File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 한 화면에 질문 하나씩 물어보는 인터뷰형 단계 구성. 필드·검증 로직은 기존 단일 폼과
 * 동일하게 유지하고(lib/inquiries/validate.ts 재사용), 화면만 단계별로 나눈다.
 *
 * "featureChecklist" 단계는 serviceCategory가 "shopping"/"website"일 때만 포함된다 —
 * 이 두 경우만 일반적인 웹 개발 지식으로 정확한 체크리스트를 만들 수 있어서다(ERP·
 * 자동화프로그램·기타는 실제 작업 방식이 사례마다 달라 자유 텍스트로 받는다).
 */
function buildSteps(serviceCategory: string): StepConfig[] {
  const steps: StepConfig[] = [
    {
      key: "contactName",
      label: "담당자명",
      question: "담당자님 성함을 알려주세요",
      optional: false,
      requiredField: "contactName",
      tip: "성함만 알려주시면 담당자가 정확히 안내해드립니다.",
    },
    {
      key: "companyName",
      label: "회사명",
      question: "어느 회사에서 문의 주시나요?",
      optional: true,
      tip: "개인이시거나 아직 정해지지 않았다면 비워두고 다음으로 넘어가셔도 됩니다.",
    },
    {
      key: "email",
      label: "이메일",
      question: "회신받으실 이메일을 알려주세요",
      optional: false,
      requiredField: "email",
      tip: "제출 확인과 답변은 이 이메일로 발송됩니다.",
    },
    {
      key: "phone",
      label: "연락처",
      question: "편하게 연락드릴 번호가 있으신가요?",
      optional: true,
      tip: "빠른 연락을 원하시면 연락처를 함께 남겨주세요.",
    },
    {
      key: "serviceCategory",
      label: "제작 항목",
      question: "무엇을 만들고 싶으신가요?",
      optional: true,
      tip: "가장 가까운 항목을 선택해주시면 이후 질문이 그에 맞게 조정됩니다.",
    },
    {
      key: "siteType",
      label: "프로젝트 유형",
      question: "어떤 유형의 프로젝트인가요?",
      optional: true,
      tip: "가장 가까운 유형을 선택해주시면 상담 준비에 도움이 됩니다.",
    },
  ];

  if (serviceCategory === "shopping" || serviceCategory === "website") {
    steps.push({
      key: "featureChecklist",
      label: "기능 체크리스트",
      question: "필요한 기능을 선택해주세요",
      optional: true,
      tip: "해당하는 기능을 체크해주시면 견적과 제안이 더 정확해집니다. 목록에 없는 기능은 마지막 문의 내용에 적어주세요.",
    });
  }

  steps.push(
    {
      key: "budget",
      label: "예산",
      question: "예상하시는 예산 규모가 있으신가요?",
      optional: true,
      tip: "대략적인 범위만 적어주셔도 충분합니다.",
    },
    {
      key: "companyInfo",
      label: "회사 정보",
      question: "회사에 대해 조금 더 알려주시겠어요?",
      optional: true,
      tip: "업종·브랜드 컬러·도메인을 미리 알려주시면 분석과 제안이 더 정확해집니다.",
    },
    {
      key: "attachments",
      label: "참고 자료",
      question: "참고할 자료가 있으면 올려주세요",
      optional: true,
      tip: "로고·서비스 사진 등 파일을 여러 개 올리거나, 참고하고 싶은 사이트 주소를 남겨주세요.",
    },
    {
      key: "requirements",
      label: "문의 내용",
      question: "프로젝트에 대해 자유롭게 설명해주세요",
      optional: false,
      requiredField: "requirements",
      tip: "목적, 필요한 기능, 참고 사이트 등을 자유롭게 적어주시면 더 정확한 답변을 드릴 수 있어요.",
    },
  );

  return steps;
}

type UploadResponse =
  | { success: true; type: "image" | "file"; url: string; storage: "supabase" | "local" }
  | { success: true; type: "code"; filename: string; content: string }
  | { success: false; error: string };

/**
 * AI Business OS Rewiring Phase 1 — cnbiz.kr의 직접 문의 폼. POST /api/inquiries(내부,
 * app/api/inquiries/route.ts)로 제출한다. 검증은 서버와 동일한 lib/inquiries/validate.ts를
 * 그대로 재사용해 새 검증 로직을 만들지 않는다.
 */
export function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<InquiryValidationErrors>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const steps = buildSteps(form.serviceCategory);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFeature(id: string) {
    setSelectedFeatures((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  function goPrev() {
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  function addFiles(fileList: FileList) {
    const accepted: StagedFile[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(`${file.name} (파일 크기 초과)`);
        continue;
      }
      accepted.push({ id: `${file.name}-${file.lastModified}-${file.size}`, file });
    }

    if (accepted.length > 0) setStagedFiles((prev) => [...prev, ...accepted]);
    setFileWarning(rejected.length > 0 ? `업로드할 수 없는 파일: ${rejected.join(", ")}` : null);
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }

  function removeFile(id: string) {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function uploadOne(file: File): Promise<UploadResponse> {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/inquiries/upload", { method: "POST", body });
    return res.json();
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const nextDisabled = Boolean(step.requiredField) && !form[step.requiredField!].trim();

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLastStep) {
      setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
      return;
    }

    const referenceUrls = form.referenceUrls
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);

    const survey: Record<string, string> = {};
    if (form.brandColor.trim()) survey["브랜드컬러"] = form.brandColor.trim();
    if (form.domain.trim()) survey["도메인"] = form.domain.trim();
    const serviceCategoryLabel = SERVICE_CATEGORIES.find((c) => c.id === form.serviceCategory)?.label;
    if (serviceCategoryLabel) survey["희망 제작물"] = serviceCategoryLabel;
    if (selectedFeatures.length > 0) {
      const checklist = FEATURE_CHECKLISTS[form.serviceCategory] ?? [];
      const labels = selectedFeatures
        .map((id) => checklist.find((item) => item.id === id)?.label)
        .filter((label): label is string => Boolean(label));
      if (labels.length > 0) survey["희망 기능"] = labels.join(", ");
    }

    const input = parseInquiryInput({
      source: "manual",
      ...form,
      referenceUrls,
      survey: Object.keys(survey).length > 0 ? survey : undefined,
    });
    const validationErrors = validateInquiryInput(input);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const erroredStepIndex = steps.findIndex((s) => s.key in validationErrors);
      if (erroredStepIndex !== -1) setCurrentStep(erroredStepIndex);
      return;
    }

    setErrors({});
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const uploadedFiles: string[] = [];
      const uploadFailures: string[] = [];
      for (const staged of stagedFiles) {
        const result = await uploadOne(staged.file);
        if (!result.success) {
          uploadFailures.push(`${staged.file.name} (${result.error})`);
        } else if (result.type !== "code") {
          uploadedFiles.push(result.url);
        }
      }
      setFileWarning(uploadFailures.length > 0 ? `일부 파일 업로드 실패: ${uploadFailures.join(", ")}` : null);
      input.uploadedFiles = uploadedFiles.length > 0 ? uploadedFiles : undefined;

      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data: { success: boolean; error?: string; errors?: InquiryValidationErrors } = await res.json();

      if (!data.success) {
        setErrors(data.errors ?? {});
        const erroredStepIndex = steps.findIndex((s) => data.errors && s.key in data.errors);
        if (erroredStepIndex !== -1) setCurrentStep(erroredStepIndex);
        setErrorMessage(data.error ?? "문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setStatus("error");
        return;
      }

      setForm(INITIAL_STATE);
      setStagedFiles([]);
      setFileWarning(null);
      setSelectedFeatures([]);
      setCurrentStep(0);
      setStatus("success");
    } catch {
      setErrorMessage("문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <Section {...componentMarker("ContactForm", "components/sections/ContactForm.tsx", "문의 폼")} blendFrom="alt">
        <Container className="max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900">문의가 접수되었습니다</h2>
          <p className="mt-3 text-base text-slate-600">
            영업일 기준 24시간 이내에 담당자가 남겨주신 연락처로 연락드립니다. 다음 단계는
            요구사항을 함께 점검하는 상담입니다. 감사합니다.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-8"
            onClick={() => {
              setStatus("idle");
              setCurrentStep(0);
            }}
          >
            새 문의 작성하기
          </Button>
        </Container>
      </Section>
    );
  }

  return (
    <Section {...componentMarker("ContactForm", "components/sections/ContactForm.tsx", "문의 폼")} blendFrom="alt">
      <Container className="max-w-2xl">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-primary">
              {currentStep + 1} / {steps.length}
            </span>
            <span className="text-slate-500">{step.label}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleFormSubmit} noValidate>
          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{step.question}</h2>
            {step.optional && <p className="mt-1 text-sm text-slate-500">(선택사항)</p>}

            <div className="mt-6">
              {step.key === "contactName" && (
                <Input
                  id="contactName"
                  label="담당자명 *"
                  value={form.contactName}
                  onChange={(e) => updateField("contactName", e.target.value)}
                />
              )}
              {step.key === "companyName" && (
                <Input
                  id="companyName"
                  label="회사명"
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                />
              )}
              {step.key === "email" && (
                <Input
                  id="email"
                  type="email"
                  label="이메일 *"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              )}
              {step.key === "phone" && (
                <Input
                  id="phone"
                  label="연락처"
                  placeholder="010-1234-5678"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              )}
              {step.key === "serviceCategory" && (
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map((category) => {
                    const selected = form.serviceCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => updateField("serviceCategory", selected ? "" : category.id)}
                        className={
                          selected
                            ? "rounded-full border-2 border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
                            : "rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        }
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {step.key === "siteType" && (
                <div className="flex flex-wrap gap-2">
                  {WEBSITE_TYPES.map((type) => {
                    const selected = form.siteType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => updateField("siteType", selected ? "" : type.id)}
                        className={
                          selected
                            ? "rounded-full border-2 border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
                            : "rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        }
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {step.key === "featureChecklist" && (
                <div className="flex flex-wrap gap-2">
                  {(FEATURE_CHECKLISTS[form.serviceCategory] ?? []).map((item) => {
                    const checked = selectedFeatures.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => toggleFeature(item.id)}
                        className={
                          checked
                            ? "inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
                            : "inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        }
                      >
                        {checked && (
                          <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {step.key === "budget" && (
                <Input
                  id="budget"
                  label="예산"
                  placeholder="예: 300만원, 협의 가능"
                  value={form.budget}
                  onChange={(e) => updateField("budget", e.target.value)}
                />
              )}
              {step.key === "companyInfo" && (
                <div className="flex flex-col gap-5">
                  <Input
                    id="industry"
                    label="업종"
                    placeholder="예: 요식업, 의료, 교육 등"
                    value={form.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                  />
                  <Input
                    id="brandColor"
                    label="브랜드 컬러"
                    placeholder="예: #005BAC, 블루 계열 등"
                    value={form.brandColor}
                    onChange={(e) => updateField("brandColor", e.target.value)}
                  />
                  <Input
                    id="domain"
                    label="도메인"
                    placeholder="예: mycompany.co.kr"
                    value={form.domain}
                    onChange={(e) => updateField("domain", e.target.value)}
                  />
                </div>
              )}
              {step.key === "attachments" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-900">
                      참고 사이트 URL(쉼표로 구분)
                    </label>
                    <input
                      id="referenceUrls"
                      value={form.referenceUrls}
                      onChange={(e) => updateField("referenceUrls", e.target.value)}
                      placeholder="https://example.com, https://example2.com"
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-900">
                      로고·서비스 사진 등 파일
                    </label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
                        dragOver ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p className="text-slate-500">파일을 여기로 끌어놓거나</p>
                      <label className="mt-2 inline-block cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                        파일 선택
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {stagedFiles.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-2">
                        {stagedFiles.map((staged) => (
                          <li
                            key={staged.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                          >
                            <span className="truncate">
                              {staged.file.name} · {formatFileSize(staged.file.size)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(staged.id)}
                              className="ml-3 shrink-0 text-slate-400 hover:text-red-600"
                              aria-label={`${staged.file.name} 제거`}
                            >
                              삭제
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {fileWarning && <p className="mt-2 text-sm text-red-600">{fileWarning}</p>}
                  </div>
                </div>
              )}
              {step.key === "requirements" && (
                <Textarea
                  id="requirements"
                  label="문의 내용 *"
                  placeholder="원하시는 홈페이지의 목적, 필요한 기능, 참고 사이트 등을 자유롭게 남겨주세요."
                  rows={6}
                  value={form.requirements}
                  onChange={(e) => updateField("requirements", e.target.value)}
                />
              )}
            </div>

            {errors[step.key as keyof InquiryValidationErrors] && (
              <p className="mt-3 text-sm text-red-600">{errors[step.key as keyof InquiryValidationErrors]}</p>
            )}

            <div className={`mt-8 flex items-center ${currentStep > 0 ? "justify-between" : "justify-end"}`}>
              {currentStep > 0 && (
                <Button type="button" variant="secondary" onClick={goPrev}>
                  이전
                </Button>
              )}
              <Button type="submit" disabled={nextDisabled || status === "submitting"}>
                {isLastStep ? (status === "submitting" ? "제출 중..." : "문의 보내기") : "다음"}
              </Button>
            </div>
          </Card>

          {status === "error" && errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}

          <div className="mt-4 rounded-lg bg-primary/5 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-primary">Tip.</span> {step.tip}
          </div>
        </form>
      </Container>
    </Section>
  );
}
