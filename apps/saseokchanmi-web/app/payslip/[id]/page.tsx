import { WorkerPayslip } from "@/components/worker/WorkerPayslip";

export const dynamic = "force-dynamic";

export default async function WorkerPayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkerPayslip id={id} />;
}
