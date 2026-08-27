import { NextResponse } from "next/server";
import { getWebsiteOrderByShareToken } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { listEstimatesByInquiry } from "@/lib/estimates/registry";
import { listSpecificationsByInquiry } from "@/lib/specifications/registry";
import { listTimelinesByInquiry } from "@/lib/timeline/registry";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * 의뢰자 공개 문서 조회 — 로그인 없이 링크(`/quote/[token]`)로 열리는 페이지가 호출한다.
 * `/api/launch-requests/public/[id]`와 동일한 원칙: 토큰으로만 조회하고, 관리자 전용 필드
 * (provider/model/simulated 등 내부 진단 정보)는 내려주지 않는다. 각 문서는 가장 최근 생성된
 * 1건만(재생성 이력 전체가 아니라 "지금 공유하는 최신 버전") 반환한다.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { token } = await params;

  const order = await getWebsiteOrderByShareToken(token);
  if (!order) {
    return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  }

  const [client, estimates, specifications, timelines] = await Promise.all([
    getClient(order.clientId),
    listEstimatesByInquiry(order.inquiryId),
    listSpecificationsByInquiry(order.inquiryId),
    listTimelinesByInquiry(order.inquiryId),
  ]);

  return NextResponse.json({
    companyName: client?.companyName || order.name,
    estimate: estimates[0] ?? null,
    specification: specifications[0] ?? null,
    timeline: timelines[0] ?? null,
  });
}
