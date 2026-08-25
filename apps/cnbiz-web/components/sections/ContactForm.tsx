"use client";

import { useState, type FormEvent } from "react";
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
}

const INITIAL_STATE: FormState = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  siteType: "",
  requirements: "",
  budget: "",
};

type SubmitStatus = "idle" | "submitting" | "success" | "error";

interface StepConfig {
  key: keyof FormState;
  label: string;
  question: string;
  optional: boolean;
  tip: string;
}

/**
 * 한 화면에 질문 하나씩 물어보는 인터뷰형 단계 구성. 필드·검증 로직은 기존 단일 폼과
 * 동일하게 유지하고(lib/inquiries/validate.ts 재사용), 화면만 단계별로 나눈다.
 */
const STEPS: StepConfig[] = [
  {
    key: "contactName",
    label: "담당자명",
    question: "담당자님 성함을 알려주세요",
    optional: false,
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
    key: "siteType",
    label: "프로젝트 유형",
    question: "어떤 유형의 프로젝트인가요?",
    optional: true,
    tip: "가장 가까운 유형을 선택해주시면 상담 준비에 도움이 됩니다.",
  },
  {
    key: "budget",
    label: "예산",
    question: "예상하시는 예산 규모가 있으신가요?",
    optional: true,
    tip: "대략적인 범위만 적어주셔도 충분합니다.",
  },
  {
    key: "requirements",
    label: "문의 내용",
    question: "프로젝트에 대해 자유롭게 설명해주세요",
    optional: false,
    tip: "목적, 필요한 기능, 참고 사이트 등을 자유롭게 적어주시면 더 정확한 답변을 드릴 수 있어요.",
  },
];

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

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goPrev() {
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const nextDisabled = !step.optional && !form[step.key].trim();

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLastStep) {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
      return;
    }

    const input = parseInquiryInput({ source: "manual", ...form });
    const validationErrors = validateInquiryInput(input);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const erroredStepIndex = STEPS.findIndex((s) => s.key in validationErrors);
      if (erroredStepIndex !== -1) setCurrentStep(erroredStepIndex);
      return;
    }

    setErrors({});
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data: { success: boolean; error?: string; errors?: InquiryValidationErrors } = await res.json();

      if (!data.success) {
        setErrors(data.errors ?? {});
        const erroredStepIndex = STEPS.findIndex((s) => data.errors && s.key in data.errors);
        if (erroredStepIndex !== -1) setCurrentStep(erroredStepIndex);
        setErrorMessage(data.error ?? "문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setStatus("error");
        return;
      }

      setForm(INITIAL_STATE);
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
              {currentStep + 1} / {STEPS.length}
            </span>
            <span className="text-slate-500">{step.label}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
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
              {step.key === "budget" && (
                <Input
                  id="budget"
                  label="예산"
                  placeholder="예: 300만원, 협의 가능"
                  value={form.budget}
                  onChange={(e) => updateField("budget", e.target.value)}
                />
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

            {errors[step.key] && <p className="mt-3 text-sm text-red-600">{errors[step.key]}</p>}

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
