import { requireAdminPage } from "@/lib/contract/server/page-auth";
import { ContractList } from "@/components/admin/ContractList";

export default async function AdminHomePage() {
  await requireAdminPage();
  return <ContractList />;
}
