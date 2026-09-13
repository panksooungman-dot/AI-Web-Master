import { NextResponse } from "next/server";
import { deleteContract, getContract, updateContractDocument, updateContractResult } from "@/lib/contracts/registry";
import type { ContractDocumentDetails, ContractResult } from "@/lib/contracts/types";
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

/**
 * 계약서를 부분 수정한다. `result`(계약 조항 전체)와 `document`(계약 당사자 정보 — 공급자·
 * 의뢰자 표시 필드)는 서로 독립적인 필드라 하나만 보내도, 둘 다 보내도 된다. 순서대로 처리해
 * 마지막에 반영된 레코드를 반환한다(같은 요청 안에서 순차 처리라 두 registry 함수가 서로의
 * 쓰기를 덮어쓰지 않음).
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const obj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const result = obj.result as ContractResult | undefined;
  const document = obj.document as ContractDocumentDetails | undefined;

  if ((!result || typeof result !== "object") && (!document || typeof document !== "object")) {
    return NextResponse.json({ success: false, error: "result 또는 document 필드가 필요합니다." }, { status: 400 });
  }

  let record;

  if (result && typeof result === "object") {
    record = await updateContractResult(id, result);
    if (!record) {
      return NextResponse.json({ success: false, error: "계약서를 찾을 수 없습니다." }, { status: 404 });
    }
  }

  if (document && typeof document === "object") {
    record = await updateContractDocument(id, document);
    if (!record) {
      return NextResponse.json({ success: false, error: "계약서를 찾을 수 없습니다." }, { status: 404 });
    }
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
