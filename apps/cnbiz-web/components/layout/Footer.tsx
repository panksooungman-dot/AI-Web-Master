import Link from "next/link";

const footerLinks = {
  회사: [
    { label: "회사소개", href: "/about" },
    { label: "핵심 가치", href: "/about#values" },
  ],
  사업: [
    { label: "사업소개", href: "/services" },
    { label: "디지털 전환 컨설팅", href: "/services#consulting" },
    { label: "AI / ML 솔루션", href: "/services#ai" },
    { label: "엔터프라이즈 개발", href: "/services#development" },
    { label: "클라우드 인프라", href: "/services#cloud" },
  ],
  고객지원: [
    { label: "포트폴리오", href: "/portfolio" },
    { label: "문의하기", href: "/contact" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 border-b border-slate-800 py-14 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="mb-4 inline-block">
              <span className="text-2xl font-bold tracking-tight text-white">
                CN<span className="text-primary-light">BIZ</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              디지털 혁신으로
              <br />
              비즈니스의 미래를 함께 만듭니다.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="mb-4 text-sm font-semibold text-white">{category}</p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 py-6 text-xs text-slate-400">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
            <span>회사명: 씨엔비즈</span>
            <span className="hidden sm:inline">|</span>
            <span>대표: 박성만</span>
            <span className="hidden sm:inline">|</span>
            <span>사업자등록번호: 812-08-00355</span>
          </div>
          <p>주소: 서울특별시 금천구 두산로70길 현대지식산업센터 A동 1210/1702호</p>
          <p>© 2026 CNBIZ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
