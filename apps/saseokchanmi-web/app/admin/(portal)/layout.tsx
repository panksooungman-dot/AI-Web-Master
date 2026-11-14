import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminPage } from "@/lib/contract/server/page-auth";

export const dynamic = "force-dynamic";

/** 로그인한 관리자만 들어오는 화면들의 공통 틀. 각 페이지도 서버에서 세션을 다시 확인한다. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="bg-background">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
