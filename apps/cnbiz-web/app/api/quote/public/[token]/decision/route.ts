import { NextResponse } from "next/server";
import { getWebsiteOrderByShareToken } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { listEstimatesByInquiry, recordEstimateClientDecision } from "@/lib/estimates/registry";
import { notifyAdminOfEstimateActivity } from "@/lib/estimates/notify";
import type { EstimateClientDecision } from "@/lib/estimates/types";

interface RouteParams {
  params: Promise<{ token: string }>;
}

const VALID_DECISIONS: EstimateClientDecision[] = ["accepted", "rejected"];

/**
 * 의뢰자가 `/quote/[token]` 공개 페이지에서 견적서를 수락/거절할 때 호출한다. 로그인 없이
 * 토큰만으로 동작하므로(`/api/quote/public` prefix, lib/auth/rbac.ts에서 게이팅 제외) 토큰이
 * 가리키는 WebsiteOrder의 가장 최근 견적서 1건에만 적용한다 — GET과 동일한 "지금 공유하는
 * 최신 버전" 원칙.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const decision = typeof body === "object" && body !== null ? (body as Record<string, unknown>).decision : undefined;
  if (typeof decision !== "string" || !VALID_DECISIONS.includes(decision as EstimateClientDecision)) {
    return NextResponse.json({ success: false, error: "decision 값이 올바르지 않습니다." }, { status: 400 });
  }

  const order = await getWebsiteOrderByShareToken(token);
  if (!order) {
    return NextResponse.json({ success: false, error: "문서를 찾을 수 없습니다." }, { status: 404 });
  }

  const estimates = await listEstimatesByInquiry(order.inquiryId);
  const estimate = estimates[0];
  if (!estimate) {
    return NextResponse.json({ success: false, error: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await recordEstimateClientDecision(estimate.id, decision as EstimateClientDecision);
  const client = await getClient(order.clientId);
  const companyName = client?.companyName || order.name;
  const decisionLabel = decision === "accepted" ? "수락" : "거절";

  await notifyAdminOfEstimateActivity(
    "estimate.client_decision",
    updated ?? estimate,
    companyName,
    `[CNBIZ] 견적서 ${decisionLabel} — ${companyName}`,
    [`고객사: ${companyName}`, `견적서를 ${decisionLabel}했습니다.`]
  );

  return NextResponse.json({ success: true, estimate: updated });
}
