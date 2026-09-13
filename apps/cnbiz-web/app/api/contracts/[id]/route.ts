import { NextResponse } from "next/server";
import { deleteContract, getContract, updateContractResult } from "@/lib/contracts/registry";
import type { ContractResult } from "@/lib/contracts/types";
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

/** 계약 조항(제목·범위·일정·조건 등) 전체를 관리자가 직접 수정해 저장한다. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const result =
    typeof body === "object" && body !== null
      ? ((body as Record<string, unknown>).result as ContractResult | undefined)
      : undefined;

  if (!result || typeof result !== "object") {
    return NextResponse.json({ success: false, error: "result 필드가 필요합니다." }, { status: 400 });
  }

  const record = await updateContractResult(id, result);

  if (!record) {
    return NextResponse.json({ success: false, error: "계약서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, contract: record });
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
