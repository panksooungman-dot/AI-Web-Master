import { requireAdminPage } from "@/lib/contract/server/page-auth";
import { SubmissionDetail } from "@/components/admin/SubmissionDetail";

export const metadata = { title: "제출된 계약서" };

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  return <SubmissionDetail id={id} />;
}
