import { requireAdminPage } from "@/lib/contract/server/page-auth";
import { ContractEditor } from "@/components/admin/ContractEditor";

export const metadata = { title: "직원 계약 수정" };

export default async function EditContractPage({ params }: { params: Promise<{ token: string }> }) {
  await requireAdminPage();
  const { token } = await params;
  return <ContractEditor token={token} />;
}
