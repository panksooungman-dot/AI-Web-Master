import { NextResponse } from "next/server";
import { deleteContract, getContract } from "@/lib/contracts/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const contract = await getContract(id);

  if (!contract) {
    return NextResponse.json({ error: "계약서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ contract });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getContract(id);

  if (!record) {
    return NextResponse.json({ success: false, error: "계약서를 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteContract(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "contract.delete",
    actor,
    success: true,
    detail: `"${record.input.companyName}" 계약서 삭제`,
    metadata: { contractId: id },
  });

  return NextResponse.json({ success: true });
}
