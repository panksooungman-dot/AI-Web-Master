import type { Metadata } from "next";

/** 근로자 계약 화면은 검색엔진에 노출하지 않는다. */
export const metadata: Metadata = {
  title: "근로계약서",
  robots: { index: false, follow: false, nocache: true },
};

export default function ContractLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">{children}</div>;
}
