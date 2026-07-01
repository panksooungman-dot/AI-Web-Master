import Link from "next/link";

const footerLinks = {
  회사: [
    { label: "회사소개", href: "/about" },
    { label: "회사 연혁", href: "/about#history" },
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
    { label: "문의하기", href: "/contact" },
    { label: "이메일 문의", href: "/contact#form" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-14 border-b border-slate-800">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-bold text-white tracking-tight">
                CN<span className="text-blue-400">BIZ</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              디지털 혁신으로<br />
              비즈니스의 미래를 함께 만듭니다.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="text-sm font-semibold text-white mb-4">{category}</p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center">
            <span>(주)씨엔비즈 | 대표이사: — | 사업자등록번호: —</span>
            <span className="hidden sm:inline">|</span>
            <span>서울특별시 — (주소 추후 업데이트)</span>
          </div>
          <p className="shrink-0">© 2025 CNBIZ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
