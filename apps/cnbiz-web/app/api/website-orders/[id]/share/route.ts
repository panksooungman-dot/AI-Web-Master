import { NextResponse } from "next/server";
import { getWebsiteOrder, ensureWebsiteOrderShareToken } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { createSolapiNotifier } from "@/lib/inquiries/solapi";
import { recordAuditEvent } from "@/lib/audit/log";
import { SITE_URL } from "@/lib/site-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 견적서·기능명세서·프로젝트 일정을 로그인 없이 볼 수 있는 공개 링크(`/quote/[token]`)를
 * 생성/재사용하고, SOLAPI로 의뢰자 휴대폰에 문자로 발송한다. 이메일/Slack/SOLAPI 관리자 알림
 * (lib/inquiries/notify.ts)과 동일하게 env 미설정/발송 실패를 조용히 삼키지 않고 Audit Log
 * (`document.share_customer`)에 남긴다 — 다만 이 라우트는 버튼을 누른 즉시 결과를 확인해야 하는
 * 관리자 액션이라 실패 시 그 자리에서 바로 오류를 반환한다(관리자 알림처럼 백그라운드로
 * 조용히 실패하지 않음).
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const order = await getWebsiteOrder(id);
  if (!order) {
    return NextResponse.json({ success: false, error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const client = await getClient(order.clientId);
  if (!client) {
    return NextResponse.json({ success: false, error: "고객사 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!client.phone) {
    return NextResponse.json({ success: false, error: "고객사 연락처(전화번호)가 없습니다." }, { status: 400 });
  }

  const shareToken = await ensureWebsiteOrderShareToken(id);
  if (!shareToken) {
    return NextResponse.json({ success: false, error: "공유 링크 생성에 실패했습니다." }, { status: 500 });
  }

  const shareUrl = `${SITE_URL}/quote/${shareToken}`;

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_FROM;

  if (!apiKey || !apiSecret || !from) {
    const missing = [!apiKey && "SOLAPI_API_KEY", !apiSecret && "SOLAPI_API_SECRET", !from && "SOLAPI_FROM"]
      .filter(Boolean)
      .join(", ");
    await recordAuditEvent({
      action: "document.share_customer",
      actor: null,
      success: false,
      detail: `의뢰자 문서 공유 SMS 건너뜀 — 환경 변수 미설정: ${missing}`,
      metadata: { websiteOrderId: order.id, clientId: client.id },
    });
    return NextResponse.json(
      { success: false, error: `SOLAPI 환경 변수가 설정되지 않았습니다: ${missing}`, shareUrl },
      { status: 400 }
    );
  }

  try {
    const notifier = createSolapiNotifier(apiKey, apiSecret, client.phone, from);
    await notifier.send(
      [
        `[CNBIZ] ${client.companyName || client.contactName}님, 프로젝트 문서(견적서 등)가 준비되었습니다.`,
        `아래 링크에서 확인해주세요.`,
        shareUrl,
      ].join("\n")
    );

    await recordAuditEvent({
      action: "document.share_customer",
      actor: null,
      success: true,
      detail: `의뢰자 문서 공유 SMS 발송: "${client.companyName || client.contactName}" → ${client.phone}`,
      metadata: { websiteOrderId: order.id, clientId: client.id },
    });

    return NextResponse.json({ success: true, shareUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordAuditEvent({
      action: "document.share_customer",
      actor: null,
      success: false,
      detail: `의뢰자 문서 공유 SMS 발송 실패: ${message}`,
      metadata: { websiteOrderId: order.id, clientId: client.id },
    });
    return NextResponse.json({ success: false, error: message, shareUrl }, { status: 502 });
  }
}
