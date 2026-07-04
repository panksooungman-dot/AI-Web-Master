"use client";

import { useState, type FormEvent } from "react";
import { Input, Textarea, Button } from "@cnbiz/ui";

type FormStatus = "idle" | "submitting" | "success" | "error";

interface FormValues {
  name: string;
  phone: string;
  email: string;
  message: string;
  /** Honeypot — left blank by real users, filled in by bots. Never validated or shown as an error. */
  company: string;
}

const INITIAL_VALUES: FormValues = { name: "", phone: "", email: "", message: "", company: "" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9-+\s]{9,15}$/;

function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!values.name.trim()) errors.name = "이름을 입력해주세요.";
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
  if (!values.message.trim()) errors.message = "문의 내용을 입력해주세요.";
  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [status, setStatus] = useState<FormStatus>("idle");

  function handleChange(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("submit failed");
      setStatus("success");
      setValues(INITIAL_VALUES);
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-8 text-center shadow-md">
        <h3 className="text-lg font-bold text-slate-900">문의가 접수되었습니다</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          담당자가 영업일 기준 24시간 이내에 연락드리겠습니다.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-xl border border-slate-100 bg-white p-6 shadow-md lg:p-8"
    >
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.company}
          onChange={handleChange("company")}
        />
      </div>

      <Input
        id="name"
        label="이름"
        value={values.name}
        onChange={handleChange("name")}
        aria-invalid={Boolean(errors.name)}
      />
      {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}

      <Input
        id="phone"
        label="연락처"
        value={values.phone}
        onChange={handleChange("phone")}
        aria-invalid={Boolean(errors.phone)}
      />
      {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}

      <Input
        id="email"
        label="이메일"
        type="email"
        value={values.email}
        onChange={handleChange("email")}
        aria-invalid={Boolean(errors.email)}
      />
      {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}

      <Textarea
        id="message"
        label="문의 내용"
        rows={5}
        value={values.message}
        onChange={handleChange("message")}
        aria-invalid={Boolean(errors.message)}
      />
      {errors.message && <p className="text-sm text-red-600">{errors.message}</p>}

      {status === "error" && (
        <p className="text-sm text-red-600">
          문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      <Button type="submit" disabled={status === "submitting"} className="w-full">
        {status === "submitting" ? "전송 중..." : "문의 보내기"}
      </Button>
    </form>
  );
}
