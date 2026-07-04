"use client";

import { useState } from "react";
import { Container, Section } from "@cnbiz/layout-primitives";

const faqs = [
  {
    question: "프로젝트 진행 절차는 어떻게 되나요?",
    answer:
      "상담 신청 → 요구사항 분석 → 제안 및 견적 → 프로젝트 착수 → 지속적 지원의 5단계로 진행됩니다.",
  },
  {
    question: "어떤 서비스를 제공하나요?",
    answer:
      "디지털 전환 컨설팅, AI/ML 솔루션, 엔터프라이즈 개발, 클라우드 인프라 4가지 핵심 서비스를 제공합니다.",
  },
  {
    question: "견적 문의는 어떻게 하나요?",
    answer: "문의하기 페이지의 양식을 작성해 주시면 영업일 기준 24시간 이내에 담당자가 연락드립니다.",
  },
  {
    question: "프로젝트 완료 후에도 유지보수를 받을 수 있나요?",
    answer:
      "네, 오픈 이후에도 운영·유지보수를 통해 안정적인 서비스를 지속적으로 지원합니다. 세부 조건은 프로젝트 특성에 따라 상담을 통해 협의합니다.",
  },
  {
    question: "소규모 기업도 프로젝트를 의뢰할 수 있나요?",
    answer:
      "프로젝트 규모와 무관하게 고객의 상황과 목표에 맞는 협업 방식을 상담을 통해 함께 결정합니다.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section background="white" id="faq">
      <Container>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            자주 묻는 질문
          </h2>
        </div>

        <div className="mx-auto max-w-3xl divide-y divide-slate-100 rounded-xl border border-slate-100 shadow-md">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-semibold text-slate-900">{faq.question}</span>
                  <svg
                    aria-hidden
                    className={`h-5 w-5 shrink-0 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <p id={`faq-answer-${index}`} className="px-6 pb-5 leading-relaxed text-slate-600">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
