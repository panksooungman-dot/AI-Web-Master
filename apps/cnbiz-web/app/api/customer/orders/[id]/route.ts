import { NextResponse } from "next/server";
import { getCustomerOrderDetail } from "@/lib/customerPortal/view";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { recordAuditEvent } from "@/lib/audit/log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Customer Portal V1 — 주문 상세(견적서·명세서·타임라인·계약서·제안서·배포 상태 전부 포함).
 * getCustomerOrderDetail()이 이 email의 Client 소유가 아닌 orderId에는 null을 반환하므로,
 * "존재하지 않음"과 "내 것이 아님"을 구분하지 않고 동일하게 404로 응답한다(다른 고객의 orderId를
 * 추측해도 그 존재 여부조차 알 수 없다 — "본인 데이터만 조회 가능"의 실제 강제 지점).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const email = await getCurrentActorEmail();

  if (!email) {
    return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const order = await getCustomerOrderDetail(email, id);

  if (!order) {
    return NextResponse.json({ success: false, error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const documentTypes: string[] = [
    order.hasEstimate && "estimate",
    order.hasSpecification && "specification",
    order.hasTimeline && "timeline",
    order.hasContract && "contract",
    order.hasProposal && "proposal",
  ].filter((value): value is string => typeof value === "string");

  await recordAuditEvent({
    action: "customer.view_document",
    actor: email,
    success: true,
    detail: `고객 포털 주문 상세 조회: "${order.companyName}" (${documentTypes.join(", ") || "문서 없음"})`,
    metadata: { websiteOrderId: id, inquiryId: order.inquiryId, documentTypes },
  });

  return NextResponse.json({ success: true, order });
}
