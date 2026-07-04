import { Container, Section } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";

const contactInfo = [
  { label: "대표 전화번호", value: null },
  { label: "대표 이메일", value: null },
  { label: "회사 주소", value: null },
  { label: "운영 시간", value: null },
  { label: "문의 응답 정책", value: "영업일 기준 24시간 이내 답변" },
];

function TodoBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
      TODO
    </span>
  );
}

export function ContactInfoSection() {
  return (
    <Section background="alt" id="info">
      <Container>
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="p-0">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">연락처 정보</h2>
              <p className="mt-1 text-sm text-slate-600">
                확인되지 않은 정보는 확정 후 업데이트될 예정입니다.
              </p>
            </div>
            <dl className="divide-y divide-slate-100">
              {contactInfo.map((item) => (
                <div key={item.label} className="grid grid-cols-3 gap-4 px-6 py-5">
                  <dt className="text-sm font-semibold text-slate-900">{item.label}</dt>
                  <dd className="col-span-2 text-sm leading-relaxed text-slate-600">
                    {item.value ?? <TodoBadge />}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="flex flex-col items-center justify-center gap-3 border-dashed border-slate-300 bg-white p-8 text-center">
            <svg
              aria-hidden
              className="h-10 w-10 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.498a1.125 1.125 0 0 0-1.006 0L3.622 5.935A1.125 1.125 0 0 0 3 6.94v10.222c0 .436.24.825.622 1.006l4.875 2.437c.317.158.69.158 1.006 0l4.994-2.497c.317-.158.69-.158 1.006 0Z"
              />
            </svg>
            <TodoBadge />
            <h3 className="text-lg font-bold text-slate-500">지도 위치 준비 중</h3>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              정확한 위치 확인 후 카카오맵/구글맵 연동 여부를 결정하여 표시할 예정입니다.
            </p>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
