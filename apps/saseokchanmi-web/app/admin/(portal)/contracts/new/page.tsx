import { requireAdminPage } from "@/lib/contract/server/page-auth";
import { ContractEditor } from "@/components/admin/ContractEditor";

export const metadata = { title: "직원 계약 만들기" };

export default async function NewContractPage() {
  await requireAdminPage();
  return <ContractEditor />;
}
