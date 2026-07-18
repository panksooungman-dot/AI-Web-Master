"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Input, Textarea, Select, Button } from "@cnbiz/ui";
import { BUDGET_OPTIONS, FEATURE_OPTIONS, INDUSTRY_OPTIONS, SITE_TYPE_OPTIONS } from "@/lib/requests/options";

type FormStatus = "idle" | "submitting" | "success" | "error";

interface FormValues {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  siteType: string;
  features: string[];
  referenceSites: string;
  budget: string;
  message: string;
  /** Honeypot — left blank by real users, filled in by bots. Never validated or shown as an error. */
  website: string;
}

const INITIAL_VALUES: FormValues = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  industry: "",
  siteType: "",
  features: [],
  referenceSites: "",
  budget: "",
  message: "",
  website: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9-+\s]{9,15}$/;

type FieldErrors = Partial<Record<keyof FormValues, string>>;

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.companyName.trim()) errors.companyName = "회사명을 입력해주세요.";
  if (!values.contactName.trim()) errors.contactName = "담당자명을 입력해주세요.";

  if (!values.email.trim()) {
    errors.email = "이메일을 입력해주세요.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "올바른 이메일 형식이 아닙니다.";
  }

  if (!values.phone.trim()) {
    errors.phone = "연락처를 입력해주세요.";
  } else if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = "올바른 연락처 형식이 아닙니다.";
  }

  if (!values.industry) errors.industry = "업종을 선택해주세요.";
  if (!values.siteType) errors.siteType = "홈페이지 종류를 선택해주세요.";
  if (!values.message.trim()) errors.message = "요청사항을 입력해주세요.";

  return errors;
}

export function RequestForm() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<FormStatus>("idle");

  function handleChange(field: keyof Omit<FormValues, "features">) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function toggleFeature(feature: string) {
    setValues((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((item) => item !== feature)
        : [...prev.features, feature],
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/requests/submit", {
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
        <h3 className="text-lg font-bold text-slate-900">의뢰가 접수되었습니다</h3>
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
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={handleChange("website")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Input
            id="companyName"
            label="회사명"
            value={values.companyName}
            onChange={handleChange("companyName")}
            aria-invalid={Boolean(errors.companyName)}
          />
          {errors.companyName && <p className="mt-1.5 text-sm text-red-600">{errors.companyName}</p>}
        </div>

        <div>
          <Input
            id="contactName"
            label="담당자명"
            value={values.contactName}
            onChange={handleChange("contactName")}
            aria-invalid={Boolean(errors.contactName)}
          />
          {errors.contactName && <p className="mt-1.5 text-sm text-red-600">{errors.contactName}</p>}
        </div>

        <div>
          <Input
            id="email"
            label="이메일"
            type="email"
            value={values.email}
            onChange={handleChange("email")}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <Input
            id="phone"
            label="연락처"
            value={values.phone}
            onChange={handleChange("phone")}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <p className="mt-1.5 text-sm text-red-600">{errors.phone}</p>}
        </div>

        <div>
          <Select
            id="industry"
            label="업종"
            value={values.industry}
            onChange={handleChange("industry")}
            aria-invalid={Boolean(errors.industry)}
          >
            <option value="">선택해주세요</option>
            {INDUSTRY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          {errors.industry && <p className="mt-1.5 text-sm text-red-600">{errors.industry}</p>}
        </div>

        <div>
          <Select
            id="siteType"
            label="홈페이지 종류"
            value={values.siteType}
            onChange={handleChange("siteType")}
            aria-invalid={Boolean(errors.siteType)}
          >
            <option value="">선택해주세요</option>
            {SITE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          {errors.siteType && <p className="mt-1.5 text-sm text-red-600">{errors.siteType}</p>}
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-900">필요한 기능 (선택)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEATURE_OPTIONS.map((feature) => (
            <label
              key={feature}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={values.features.includes(feature)}
                onChange={() => toggleFeature(feature)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
              />
              {feature}
            </label>
          ))}
        </div>
      </fieldset>

      <Input
        id="referenceSites"
        label="참고 사이트 (선택)"
        placeholder="참고하고 싶은 사이트 URL을 입력해주세요"
        value={values.referenceSites}
        onChange={handleChange("referenceSites")}
      />

      <Select id="budget" label="예산 (선택)" value={values.budget} onChange={handleChange("budget")}>
        <option value="">협의 가능</option>
        {BUDGET_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      <div>
        <Textarea
          id="message"
          label="요청사항"
          rows={5}
          placeholder="원하시는 홈페이지에 대해 자유롭게 설명해주세요."
          value={values.message}
          onChange={handleChange("message")}
          aria-invalid={Boolean(errors.message)}
        />
        {errors.message && <p className="mt-1.5 text-sm text-red-600">{errors.message}</p>}
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600">
          의뢰 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      <Button type="submit" disabled={status === "submitting"} className="w-full">
        {status === "submitting" ? "전송 중..." : "의뢰 접수하기"}
      </Button>
    </form>
  );
}
