import type { Metadata } from "next";

/** 직원 본인 급여명세서 확인 화면. 검색엔진에 노출하지 않는다. */
export const metadata: Metadata = {
  title: "급여명세서 확인",
  robots: { index: false, follow: false, nocache: true },
};

export default function PayslipLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">{children}</div>;
}
