import { requireAdminPage } from "@/lib/contract/server/page-auth";
import { SubmissionList } from "@/components/admin/SubmissionList";

export const metadata = { title: "제출 현황" };

export default async function SubmissionsPage() {
  await requireAdminPage();
  return <SubmissionList />;
}
