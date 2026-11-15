import { requireAdminPage } from "@/lib/contract/server/page-auth";
import { BackupPanel } from "@/components/admin/BackupPanel";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "공통 설정" };

export default async function SettingsPage() {
  await requireAdminPage();
  return (
    <div className="space-y-8">
      <SettingsForm />
      <div className="mx-auto max-w-2xl">
        <BackupPanel />
      </div>
    </div>
  );
}
