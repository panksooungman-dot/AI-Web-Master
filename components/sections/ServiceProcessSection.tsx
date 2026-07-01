const steps = [
  { step: "01", title: "상담 신청", desc: "홈페이지 또는 이메일로 문의를 남겨주시면 담당자가 영업일 24시간 내 연락드립니다." },
  { step: "02", title: "요구사항 분석", desc: "현황과 목표를 함께 점검하고 프로젝트 범위를 구체화합니다." },
  { step: "03", title: "제안 및 견적", desc: "맞춤형 솔루션과 일정, 비용을 담은 제안서를 전달합니다." },
  { step: "04", title: "프로젝트 착수", desc: "계약 체결 후 전담팀이 구성되어 본격적으로 프로젝트를 시작합니다." },
  { step: "05", title: "지속적 지원", desc: "오픈 이후에도 운영·유지보수를 통해 안정적인 서비스를 지원합니다." },
];

export default function ServiceProcessSection() {
  return (
    <section className="py-24 bg-secondary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary-light text-sm font-semibold tracking-widest uppercase mb-3">
            Process
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            도입 프로세스
          </h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            문의부터 프로젝트 완료까지, CNBIZ와 함께하는 과정입니다.
          </p>
        </div>

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((item) => (
            <li
              key={item.step}
              className="rounded-xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-3xl font-bold text-primary-light">{item.step}</p>
              <h3 className="mt-3 font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{item.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
