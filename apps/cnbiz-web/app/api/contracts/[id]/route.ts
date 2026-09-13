import { NextResponse } from "next/server";
import { deleteContract, getContract, updateContractDocument, updateContractResult } from "@/lib/contracts/registry";
import type { ContractDocumentDetails, ContractResult } from "@/lib/contracts/types";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { getWebsiteOrder } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 계약서 조회 시 연결된 Client(문의 접수 시 이미 실제로 입력된 담당자명·연락처)도 함께
 * 내려준다 — `/developer/contracts/[id]`가 "계약 당사자" 편집 폼의 의뢰자 기본값을 매번
 * 수동으로 다시 입력하지 않고 자동으로 채우기 위함(`buildDefaultContractDocument()`의
 * clientDefaults 인자로 전달됨). 사업자번호·대표자명·주소는 Client 레코드에 아예 없어(문의
 * 흐름에서 수집한 적이 없음) 여기서도 내려줄 수 없다 — 계속 관리자가 직접 입력해야 한다.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const contract = await getContract(id);

  if (!contract) {
    return NextResponse.json({ error: "계약서를 찾을 수 없습니다." }, { status: 404 });
  }

  const order = await getWebsiteOrder(contract.websiteOrderId);
  const client = order ? await getClient(order.clientId) : undefined;
  const clientContact = client ? { contactName: client.contactName, phone: client.phone } : null;

  return NextResponse.json({ contract, clientContact });
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
