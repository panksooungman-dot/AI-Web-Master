import { DepositExcludes } from "@/components/admin/DepositExcludes";
import { DepositBoard } from "@/components/deposits/DepositBoard";
import { requireAdminPage } from "@/lib/contract/server/page-auth";

export const metadata = { title: "입금 확인" };

export default async function DepositsAdminPage() {
  await requireAdminPage();
  return (
    <div className="space-y-6">
      <DepositBoard admin />
      <DepositExcludes />
    </div>
  );
}
