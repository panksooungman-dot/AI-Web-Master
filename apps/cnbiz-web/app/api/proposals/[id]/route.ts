import { NextResponse } from "next/server";
import { deleteProposal, getProposal } from "@/lib/proposals/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const proposal = await getProposal(id);

  if (!proposal) {
    return NextResponse.json({ error: "제안서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ proposal });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getProposal(id);

  if (!record) {
    return NextResponse.json({ success: false, error: "제안서를 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteProposal(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "proposal.delete",
    actor,
    success: true,
    detail: `"${record.input.companyName}" 제안서 삭제`,
    metadata: { proposalId: id },
  });

  return NextResponse.json({ success: true });
}
