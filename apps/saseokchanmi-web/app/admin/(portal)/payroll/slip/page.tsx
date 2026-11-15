import { PayslipEditor } from "@/components/admin/PayslipEditor";
import { requireAdminPage } from "@/lib/contract/server/page-auth";

export const metadata = { title: "급여명세서" };

export default async function PayslipPage({ searchParams }: { searchParams: Promise<{ id?: string; month?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  return <PayslipEditor id={sp.id ?? ""} month={sp.month ?? ""} />;
}
