import type { ReactNode } from "react";
import Link from "next/link";
import { CustomerHeaderAuth } from "@/components/customer/CustomerHeaderAuth";

/**
 * Customer Portal V1 — 고객 대면 화면이라 /developer의 다크 테마를 재사용하지 않고 /login 페이지와
 * 같은 밝은 톤으로 별도 구성한다.
 */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/customer/dashboard" className="text-lg font-bold tracking-tight text-zinc-900">
            CNBIZ 고객 포털
          </Link>
          <CustomerHeaderAuth />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
