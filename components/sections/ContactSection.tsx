import ContactForm from "@/components/sections/ContactForm";
import { componentMarker } from "@/lib/dev/component-marker";

const infoItems = [
  {
    icon: (
      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    ),
    label: "주소",
    value: "서울특별시 — (주소 추후 업데이트)",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    label: "운영시간",
    value: "평일 09:00 - 18:00 (주말·공휴일 휴무)",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
    label: "응답 시간",
    value: "영업일 기준 24시간 이내 답변",
  },
];

export default function ContactSection() {
  return (
    <section
      id="form"
      className="scroll-mt-20 py-24 bg-white"
      {...componentMarker("ContactSection", "components/sections/ContactSection.tsx")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
            Contact
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            문의하기
          </h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            프로젝트 상담부터 간단한 질문까지, 아래 양식을 남겨주시면
            담당자가 빠르게 답변드립니다.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 max-w-5xl mx-auto">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 shadow-md p-6 sm:p-8">
              <h2 className="text-sm font-semibold text-slate-900 mb-5">
                오시는 길 및 연락처
              </h2>
              <ul className="space-y-5">
                {infoItems.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">{item.value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
