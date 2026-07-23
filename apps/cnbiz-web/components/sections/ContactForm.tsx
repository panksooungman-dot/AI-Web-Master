"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Select, Textarea } from "@cnbiz/ui";
import { Container, Section } from "@cnbiz/layout-primitives";
import { parseInquiryInput, validateInquiryInput, type InquiryValidationErrors } from "@/lib/inquiries/validate";
import { WEBSITE_TYPES } from "@/lib/websites/types";

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

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = parseInquiryInput({ source: "manual", ...form });
    const validationErrors = validateInquiryInput(input);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
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
        setErrorMessage(data.error ?? "문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setStatus("error");
        return;
      }

      setForm(INITIAL_STATE);
      setStatus("success");
    } catch {
      setErrorMessage("문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <Section>
        <Container className="max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900">문의가 접수되었습니다</h2>
          <p className="mt-3 text-base text-slate-600">
            남겨주신 연락처로 담당자가 순차적으로 연락드리겠습니다. 감사합니다.
          </p>
          <Button type="button" variant="secondary" className="mt-8" onClick={() => setStatus("idle")}>
            새 문의 작성하기
          </Button>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container className="max-w-2xl">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              id="contactName"
              label="담당자명 *"
              value={form.contactName}
              onChange={(e) => updateField("contactName", e.target.value)}
            />
            <Input
              id="companyName"
              label="회사명"
              value={form.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
            />
          </div>

          {errors.contactName && <p className="-mt-3 text-sm text-red-600">{errors.contactName}</p>}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              id="email"
              type="email"
              label="이메일 *"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <Input
              id="phone"
              label="연락처"
              placeholder="010-1234-5678"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>
          {(errors.email || errors.phone) && (
            <p className="-mt-3 text-sm text-red-600">{errors.email ?? errors.phone}</p>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select
              id="siteType"
              label="희망 사이트 유형"
              value={form.siteType}
              onChange={(e) => updateField("siteType", e.target.value)}
            >
              <option value="">선택 안 함</option>
              {WEBSITE_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </Select>
            <Input
              id="budget"
              label="예산 (선택)"
              placeholder="예: 300만원, 협의 가능"
              value={form.budget}
              onChange={(e) => updateField("budget", e.target.value)}
            />
          </div>

          <Textarea
            id="requirements"
            label="문의 내용 *"
            placeholder="원하시는 홈페이지의 목적, 필요한 기능, 참고 사이트 등을 자유롭게 남겨주세요."
            rows={6}
            value={form.requirements}
            onChange={(e) => updateField("requirements", e.target.value)}
          />
          {errors.requirements && <p className="-mt-3 text-sm text-red-600">{errors.requirements}</p>}

          {status === "error" && errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          <Button type="submit" disabled={status === "submitting"} className="mt-2 self-start">
            {status === "submitting" ? "제출 중..." : "문의 보내기"}
          </Button>
        </form>
      </Container>
    </Section>
  );
}
