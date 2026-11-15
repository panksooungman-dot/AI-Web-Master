import { PayrollOverview } from "@/components/admin/PayrollOverview";
import { requireAdminPage } from "@/lib/contract/server/page-auth";

export const metadata = { title: "급여" };

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  return <PayrollOverview initialMonth={sp.month} />;
}
