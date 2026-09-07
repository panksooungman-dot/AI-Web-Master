import JobStatusView from "@/components/JobStatusView";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <JobStatusView jobId={id} />
    </main>
  );
}
