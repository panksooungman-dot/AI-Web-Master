import { NextResponse } from "next/server";
import { splitInquiryFromClient } from "@/lib/inquiries/splitClient";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * findOrCreateClient()가 이메일만으로 판단하던 시절(2026-09-12 수정 이전)에 다른 회사 문의와
 * 잘못 합쳐진 옛 Client를 바로잡는 관리자 액션. 실사용 재현: "사색찬미한정식" 문의가 "cnbiz"
 * Client에 합쳐져, 연락처(전화번호)를 고쳐도 다른 회사와 뒤섞여 있어 "문자로 공유"가 계속
 * 실패함(2026-09-13). 이 의뢰만 자기 정보로 된 새(또는 이미 일치하는) Client로 옮긴다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const result = await splitInquiryFromClient(id);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  if (result.changed) {
    const actor = await getCurrentActorEmail();
    await recordAuditEvent({
      action: "inquiry.split_client",
      actor,
      success: true,
      detail: `"${result.client.companyName || result.client.contactName}" 고객사로 분리`,
      metadata: { inquiryId: id, clientId: result.client.id },
    });
  }

  return NextResponse.json({ success: true, changed: result.changed, client: result.client });
}
