import { WorkerContract } from "@/components/worker/WorkerContract";

export const dynamic = "force-dynamic";

export default async function WorkerContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <WorkerContract token={token} />;
}
