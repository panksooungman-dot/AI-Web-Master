import { NextResponse } from "next/server";
import { ensureWebsiteOrderShareToken, getWebsiteOrder } from "@/lib/websiteOrders/registry";
import { SITE_URL } from "@/lib/site-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * `/api/website-orders/[id]/share`(SOLAPI 문자 발송)와 달리 메시지를 전혀 보내지 않고 공유
 * 링크(`/quote/[token]`)만 발급/재사용해 반환한다. 관리자가 카카오톡 등 다른 채널로 직접
 * 붙여넣어 보낼 수 있도록 "링크 복사" 버튼이 호출한다 — 부작용(문자 발송)이 없어 몇 번을
 * 눌러도 안전하다.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const order = await getWebsiteOrder(id);
  if (!order) {
    return NextResponse.json({ success: false, error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const shareToken = await ensureWebsiteOrderShareToken(id);
  if (!shareToken) {
    return NextResponse.json({ success: false, error: "공유 링크 생성에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true, shareUrl: `${SITE_URL}/quote/${shareToken}` });
}
