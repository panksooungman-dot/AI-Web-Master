"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Textarea } from "@cnbiz/ui";
import { hasFieldErrors, validateReservationInput } from "@/lib/reservation/validate";
import type { FieldErrors, ReservationInput } from "@/lib/reservation/types";
import { telUrl } from "@/lib/links";
import { CONTACT } from "@/lib/site-config";

const EMPTY_INPUT: ReservationInput = {
  name: "",
  phone: "",
  visitDate: "",
  visitTime: "",
  partySize: "",
  message: "",
  company: "",
};

type Status = "idle" | "submitting" | "success" | "error";

/**
 * 기획서 11장: 온라인 제출은 "예약 확정"이 아니라 "예약 문의 접수"임을 명확히 표시하고,
 * 전화 예약을 항상 대체 수단으로 함께 제공한다.
 */
export function ReservationForm() {
  const [input, setInput] = useState<ReservationInput>(EMPTY_INPUT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const phoneHref = telUrl();

  function update<K extends keyof ReservationInput>(key: K, value: ReservationInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = validateReservationInput(input);
    setErrors(fieldErrors);

    if (hasFieldErrors(fieldErrors)) return;

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus("error");
        setErrorMessage(data.error ?? "예약 문의 접수 중 오류가 발생했습니다.");
        if (data.errors) setErrors(data.errors);
        return;
      }

      setStatus("success");
      setInput(EMPTY_INPUT);
    } catch {
      setStatus("error");
      setErrorMessage("네트워크 오류로 접수하지 못했습니다. 전화로 문의해 주세요.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-primary/30 bg-secondary/30 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">예약 문의가 접수되었습니다.</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          확인 후 순차적으로 연락드립니다. 이 접수는 예약 확정이 아닌 예약 문의 접수이며, 급하신
          경우 전화로 문의해 주세요.
        </p>
        <Button type="button" variant="secondary" className="mt-6" onClick={() => setStatus("idle")}>
          새 예약 문의 작성하기
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <p className="rounded-lg bg-secondary/40 px-4 py-3 text-sm text-muted">
        온라인 접수는 예약 확정이 아닌 <strong className="text-foreground">예약 문의 접수</strong>
        입니다. 급하신 경우 전화로 문의해 주세요.
        {phoneHref ? (
          <a href={phoneHref} className="ml-1 font-semibold text-primary hover:underline">
            전화 문의
          </a>
        ) : (
          <span className="ml-1 font-semibold text-muted">(전화번호 확인 중)</span>
        )}
      </p>

      {/* 화면에 보이지 않는 스팸 방지용 허니팟 필드 */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">회사명</label>
        <input
          id="company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={input.company}
          onChange={(event) => update("company", event.target.value)}
        />
      </div>

      <div>
        <Input
          id="name"
          label="이름 *"
          value={input.name}
          onChange={(event) => update("name", event.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <Input
          id="phone"
          label="연락처 *"
          type="tel"
          placeholder="010-0000-0000"
          value={input.phone}
          onChange={(event) => update("phone", event.target.value)}
          aria-invalid={Boolean(errors.phone)}
        />
        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <Input
            id="visitDate"
            label="방문 희망일 *"
            type="date"
            value={input.visitDate}
            onChange={(event) => update("visitDate", event.target.value)}
            aria-invalid={Boolean(errors.visitDate)}
          />
          {errors.visitDate && <p className="mt-1 text-sm text-red-600">{errors.visitDate}</p>}
        </div>
        <div>
          <Input
            id="visitTime"
            label="희망 시간 *"
            type="time"
            value={input.visitTime}
            onChange={(event) => update("visitTime", event.target.value)}
            aria-invalid={Boolean(errors.visitTime)}
          />
          {errors.visitTime && <p className="mt-1 text-sm text-red-600">{errors.visitTime}</p>}
        </div>
        <div>
          <Input
            id="partySize"
            label="인원 *"
            inputMode="numeric"
            placeholder="예: 4"
            value={input.partySize}
            onChange={(event) => update("partySize", event.target.value)}
            aria-invalid={Boolean(errors.partySize)}
          />
          {errors.partySize && <p className="mt-1 text-sm text-red-600">{errors.partySize}</p>}
        </div>
      </div>

      <div>
        <Textarea
          id="message"
          label="문의사항"
          rows={4}
          placeholder="가족모임, 상견례, 생신 등 방문 목적이나 요청사항을 남겨주세요."
          value={input.message}
          onChange={(event) => update("message", event.target.value)}
        />
      </div>

      {status === "error" && errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
        {status === "submitting" ? "접수 중..." : "예약 문의 접수"}
      </Button>

      {!CONTACT.phone && (
        <p className="text-xs text-muted">* 전화 예약을 원하시면 매장 확인 후 안내되는 번호로 연락해 주세요.</p>
      )}
    </form>
  );
}
