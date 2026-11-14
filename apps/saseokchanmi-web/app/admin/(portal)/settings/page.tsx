import { requireAdminPage } from "@/lib/contract/server/page-auth";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "공통 설정" };

export default async function SettingsPage() {
  await requireAdminPage();
  return <SettingsForm />;
}
