"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

const LINKS = [
  { href: "/admin", label: "직원 계약", match: (p: string) => p === "/admin" || p.startsWith("/admin/contracts") },
  { href: "/admin/submissions", label: "제출 현황", match: (p: string) => p.startsWith("/admin/submissions") },
  { href: "/admin/settings", label: "공통 설정", match: (p: string) => p.startsWith("/admin/settings") },
];

export function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <header className="border-b border-secondary bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="text-sm font-bold text-foreground">근로계약서 관리</p>
          <nav aria-label="관리자 메뉴" className="flex gap-1">
            {LINKS.map((l) => {
              const on = l.match(pathname);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${on ? "bg-primary text-white" : "text-primary hover:bg-secondary/50"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
