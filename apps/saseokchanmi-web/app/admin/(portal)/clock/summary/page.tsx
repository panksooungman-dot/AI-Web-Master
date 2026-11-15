import { ClockSummary } from "@/components/admin/ClockSummary";
import { requireAdminPage } from "@/lib/contract/server/page-auth";

export const metadata = { title: "월간 출퇴근 요약" };

export default async function ClockSummaryPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  return <ClockSummary initialMonth={sp.month} />;
}
