const values = [
  {
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-1.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
    title: "전문성",
    desc: "각 분야 최고 전문가들이 검증된 방법론으로 문제를 해결합니다.",
  },
  {
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "신뢰성",
    desc: "15년 이상 검증된 납기 준수율로 약속한 결과를 반드시 전달합니다.",
  },
  {
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "혁신성",
    desc: "최신 기술을 선제적으로 도입해 고객의 경쟁력을 한 단계 높입니다.",
  },
  {
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    title: "파트너십",
    desc: "단기 프로젝트를 넘어 고객과 함께 성장하는 관계를 지향합니다.",
  },
];

export default function VisionMissionSection() {
  return (
    <section id="values" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
            Vision &amp; Mission
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            우리가 나아가는 방향
          </h2>
        </div>

        {/* Vision & Mission cards */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-slate-200 shadow-md p-6">
            <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-3">
              Vision
            </p>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              디지털로 만드는 더 나은 비즈니스
            </h3>
            <p className="text-slate-600 leading-relaxed">
              모든 기업이 디지털 기술을 통해 본질적인 경쟁력을 갖추는 세상을
              만듭니다.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 shadow-md p-6">
            <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-3">
              Mission
            </p>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              고객의 성장을 함께 설계하는 파트너
            </h3>
            <p className="text-slate-600 leading-relaxed">
              깊은 산업 이해와 최신 기술을 바탕으로 고객의 문제를 함께
              고민하고 해결합니다.
            </p>
          </div>
        </div>

        {/* Core values */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 shadow-md p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                {item.icon}
              </div>
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
