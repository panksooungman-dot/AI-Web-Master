import { ClockSheet } from "@/components/admin/ClockSheet";
import { requireAdminPage } from "@/lib/contract/server/page-auth";

export const metadata = { title: "월간 출퇴근 기록부" };

export default async function ClockSheetPage({ searchParams }: { searchParams: Promise<{ id?: string; month?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  return <ClockSheet initialId={sp.id ?? ""} initialMonth={sp.month} />;
}
