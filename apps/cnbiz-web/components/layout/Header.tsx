import Link from "next/link";
import { LinkButton } from "@cnbiz/ui";
import { MobileMenu } from "./MobileMenu";

const navLinks = [
  { label: "회사소개", href: "/about" },
  { label: "사업소개", href: "/services" },
  { label: "포트폴리오", href: "/portfolio" },
  { label: "제작 의뢰", href: "/request" },
  { label: "문의하기", href: "/contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link href="/" className="shrink-0">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            CN<span className="text-primary">BIZ</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="주요 메뉴">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <LinkButton href="/contact">무료 상담 신청</LinkButton>
        </div>

        <MobileMenu navLinks={navLinks} />
      </div>
    </header>
  );
}
