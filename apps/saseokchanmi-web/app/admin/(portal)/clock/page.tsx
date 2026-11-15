import { ClockAdmin } from "@/components/admin/ClockAdmin";
import { requireAdminPage } from "@/lib/contract/server/page-auth";

export const metadata = { title: "출퇴근" };

export default async function ClockAdminPage() {
  await requireAdminPage();
  return <ClockAdmin />;
}
