import { NextResponse } from "next/server";
import { findCustomerOrders } from "@/lib/customerPortal/view";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

/**
 * Customer Portal V1 — 로그인한 고객 본인의 주문 목록만 반환한다. proxy.ts가 이미 role="customer"
 * (또는 super_admin) 세션인지 확인한 뒤에만 이 핸들러에 도달하지만, 어떤 고객인지는 세션의 이메일로
 * 직접 조회해야 한다 — lib/customerPortal/view.ts의 findCustomerOrders()가 그 이메일과 일치하는
 * Client의 주문만 필터링하는 실제 권한 경계다. Inquiry/Client/WebsiteOrder/Estimate/...(7개 Domain)
 * 은 전부 읽기 전용으로만 호출하고, 이 라우트는 아무것도 쓰지 않는다(Presentation Layer).
 */
export async function GET() {
  const email = await getCurrentActorEmail();

  if (!email) {
    return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const orders = await findCustomerOrders(email);
  await incrementMetric("customerPortalVisitCount");

  return NextResponse.json({ success: true, orders });
}
