import { NextResponse } from "next/server";
import { splitInquiryFromClient } from "@/lib/inquiries/splitClient";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 다른 회사 문의와 잘못 합쳐졌거나(findOrCreateClient()가 이메일만으로 판단하던 2026-09-12
 * 수정 이전 데이터) Client 자체가 사라진(2026-09-13, 서로 다른 서버리스 인스턴스의 동시 쓰기
 * 경합으로 확인됨) 의뢰를 바로잡는 관리자 액션. 이 의뢰만 자기 정보로 된 새(또는 이미
 * 일치하는) Client로 옮기거나 새로 연결한다. 자세한 배경은 lib/inquiries/splitClient.ts 참고.
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
      detail: `고객사 연결을 "${result.client.companyName || result.client.contactName}"(으)로 재설정`,
      metadata: { inquiryId: id, clientId: result.client.id },
    });
  }

  return NextResponse.json({ success: true, changed: result.changed, client: result.client });
}
