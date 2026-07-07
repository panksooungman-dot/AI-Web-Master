"use client";

import { useState, type FormEvent } from "react";
import { componentMarker } from "@/lib/dev/component-marker";

const CONTACT_FORM_MARKER = componentMarker("ContactForm", "components/sections/ContactForm.tsx");

type FieldName = "name" | "phone" | "email" | "message";
type FieldErrors = Partial<Record<FieldName, string>>;
type SubmitStatus = "idle" | "submitting" | "success" | "error";

const initialValues: Record<FieldName, string> = {
  name: "",
  phone: "",
  email: "",
  message: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-() ]{9,20}$/;

function validate(values: Record<FieldName, string>): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "이름을 입력해주세요.";
  }

  if (!values.phone.trim()) {
    errors.phone = "연락처를 입력해주세요.";
  } else if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = "올바른 연락처 형식이 아닙니다.";
  }

  if (!values.email.trim()) {
    errors.email = "이메일을 입력해주세요.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "올바른 이메일 형식이 아닙니다.";
  }

  if (!values.message.trim()) {
    errors.message = "문의 내용을 입력해주세요.";
  } else if (values.message.trim().length < 10) {
    errors.message = "문의 내용을 10자 이상 입력해주세요.";
  }

  return errors;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const errorInputClass = "border-red-400 focus:border-red-500 focus:ring-red-100";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";
const errorTextClass = "mt-1.5 text-sm text-red-600";

export default function ContactForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const handleChange = (field: FieldName) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setStatus("submitting");
    try {
      // app/api/contact/route.ts는 사용자 승인 전까지 미구현 상태이므로
      // 현재는 항상 오류 응답을 받으며, 승인 후 API 연결 시 정상 동작한다.
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("submit failed");

      setStatus("success");
      setValues(initialValues);
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        className="rounded-xl border border-slate-200 shadow-md p-8 text-center"
        {...CONTACT_FORM_MARKER}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">문의가 접수되었습니다</h3>
        <p className="mt-2 text-slate-600 leading-relaxed">
          영업일 기준 24시간 이내에 담당자가 연락드리겠습니다.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-slate-200 shadow-md p-6 sm:p-8"
      {...CONTACT_FORM_MARKER}
    >
      <div>
        <label htmlFor="name" className={labelClass}>
          이름 <span className="text-primary">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={values.name}
          onChange={handleChange("name")}
          placeholder="홍길동"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={`${inputClass} ${errors.name ? errorInputClass : ""}`}
        />
        {errors.name && (
          <p id="name-error" className={errorTextClass}>{errors.name}</p>
        )}
      </div>

      <div className="mt-5">
        <label htmlFor="phone" className={labelClass}>
          연락처 <span className="text-primary">*</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={values.phone}
          onChange={handleChange("phone")}
          placeholder="010-1234-5678"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          className={`${inputClass} ${errors.phone ? errorInputClass : ""}`}
        />
        {errors.phone && (
          <p id="phone-error" className={errorTextClass}>{errors.phone}</p>
        )}
      </div>

      <div className="mt-5">
        <label htmlFor="email" className={labelClass}>
          이메일 <span className="text-primary">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={handleChange("email")}
          placeholder="example@company.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`${inputClass} ${errors.email ? errorInputClass : ""}`}
        />
        {errors.email && (
          <p id="email-error" className={errorTextClass}>{errors.email}</p>
        )}
      </div>

      <div className="mt-5">
        <label htmlFor="message" className={labelClass}>
          문의 내용 <span className="text-primary">*</span>
        </label>
        <textarea
          id="message"
          rows={5}
          value={values.message}
          onChange={handleChange("message")}
          placeholder="문의하실 내용을 입력해주세요."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={`${inputClass} resize-none ${errors.message ? errorInputClass : ""}`}
        />
        {errors.message && (
          <p id="message-error" className={errorTextClass}>{errors.message}</p>
        )}
      </div>

      {status === "error" && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {status === "submitting" ? "전송 중..." : "문의 보내기"}
      </button>
    </form>
  );
}
