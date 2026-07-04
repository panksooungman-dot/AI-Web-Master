import { Container, Section } from "@cnbiz/layout-primitives";

const placeholders = [
  { case: "Case 01" },
  { case: "Case 02" },
  { case: "Case 03" },
];

export function PortfolioPlaceholderSection() {
  return (
    <Section background="white">
      <Container>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Project Cases
          </p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            프로젝트 사례
          </h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            고객사·프로젝트 상세 내용은 자료 확정 후 업데이트될 예정입니다.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {placeholders.map((item) => (
            <div
              key={item.case}
              className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
            >
              <svg
                aria-hidden
                className="mb-4 h-10 w-10 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 4.5h18M3 4.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h18a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5"
                />
              </svg>
              <span className="mb-3 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                TODO
              </span>
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                {item.case}
              </p>
              <h3 className="mt-2 text-lg font-bold text-slate-500">공개 준비 중</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                고객사명·카테고리·성과 지표는 확인 후 게시 예정입니다.
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
