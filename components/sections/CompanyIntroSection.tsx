import Link from "next/link";
import { componentMarker } from "@/lib/dev/component-marker";

const values = [
  {
    icon: (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-1.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
    title: "전문성",
    desc: "각 분야 최고 전문가로 구성된 팀",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "신뢰성",
    desc: "15년 이상 검증된 납기 준수율",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "혁신성",
    desc: "최신 기술의 선제적 도입과 적용",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    title: "파트너십",
    desc: "고객과 함께 성장하는 장기 관계",
  },
];

export default function CompanyIntroSection() {
  return (
    <section
      id="about"
      className="py-24 bg-white"
      {...componentMarker("CompanyIntroSection", "components/sections/CompanyIntroSection.tsx")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text content */}
          <div>
            <p className="text-blue-600 text-sm font-semibold tracking-widest uppercase mb-3">
              About CNBIZ
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
              고객의 성공이<br />우리의 성장입니다
            </h2>
            <p className="mt-5 text-slate-600 text-lg leading-relaxed">
              CNBIZ는 2010년 설립 이래, 국내외 다양한 산업군의 기업들이
              디지털 시대에 경쟁력을 갖출 수 있도록 맞춤형 IT 솔루션을 제공해왔습니다.
            </p>
            <p className="mt-4 text-slate-600 leading-relaxed">
              단순한 개발 파트너를 넘어, 고객의 비즈니스를 깊이 이해하고
              장기적인 성장 전략을 함께 수립하는 신뢰할 수 있는 디지털 파트너입니다.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-2 text-blue-600 font-semibold hover:gap-3 transition-all duration-200"
            >
              회사 소개 더 보기
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Right: Value cards */}
          <div className="grid grid-cols-2 gap-4">
            {values.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-slate-50 border border-slate-100 p-6 hover:border-blue-100 hover:bg-blue-50/30 transition-colors"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
