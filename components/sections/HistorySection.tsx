import { componentMarker } from "@/lib/dev/component-marker";

const milestones = [
  { year: "2010", title: "CNBIZ 설립", desc: "IT 컨설팅 전문 기업으로 서울에서 출발했습니다." },
  { year: "2013", title: "첫 엔터프라이즈 프로젝트 수주", desc: "대기업 대상 시스템 구축 프로젝트를 성공적으로 완료했습니다." },
  { year: "2016", title: "클라우드 사업부 신설", desc: "AWS·Azure 기반 클라우드 인프라 서비스를 시작했습니다." },
  { year: "2019", title: "AI/ML 솔루션팀 신설", desc: "머신러닝·자연어 처리 기반 서비스 개발에 착수했습니다." },
  { year: "2022", title: "누적 고객사 200개 돌파", desc: "국내외 다양한 산업군의 파트너와 함께 성장했습니다." },
  { year: "2026", title: "임직원 150명 규모로 성장", desc: "각 분야 전문가 150여 명이 함께하는 조직으로 확장했습니다." },
];

export default function HistorySection() {
  return (
    <section
      id="history"
      className="py-24 bg-slate-50"
      {...componentMarker("HistorySection", "components/sections/HistorySection.tsx")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
            History
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            CNBIZ의 성장 여정
          </h2>
        </div>

        <ol className="relative max-w-3xl mx-auto border-l border-slate-200 pl-8">
          {milestones.map((item) => (
            <li key={item.year} className="relative pb-12 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[calc(2rem+5px)] top-1 h-2.5 w-2.5 rounded-full bg-primary"
              />
              <p className="text-sm font-bold text-primary">{item.year}</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-slate-600 leading-relaxed">{item.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
