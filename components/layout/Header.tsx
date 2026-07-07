import Link from "next/link";
import MobileMenu from "@/components/layout/MobileMenu";
import { componentMarker } from "@/lib/dev/component-marker";

const navLinks = [
  { label: "회사소개", href: "/about" },
  { label: "사업소개", href: "/services" },
  { label: "포트폴리오", href: "/portfolio" },
  { label: "문의하기", href: "/contact" },
];

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm"
      {...componentMarker("Header", "components/layout/Header.tsx")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              CN<span className="text-primary">BIZ</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8" aria-label="주요 메뉴">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              문의하기
            </Link>
          </div>

          {/* Mobile Menu — Client Component */}
          <MobileMenu navLinks={navLinks} />
        </div>
      </div>
    </header>
  );
}
