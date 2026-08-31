import { NextResponse } from "next/server";
import { getWebsiteOrderByShareToken } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { addEstimateMessage, listEstimatesByInquiry } from "@/lib/estimates/registry";
import { notifyAdminOfEstimateActivity } from "@/lib/estimates/notify";

interface RouteParams {
  params: Promise<{ token: string }>;
}

const MAX_MESSAGE_LENGTH = 2000;

/**
 * 의뢰자가 `/quote/[token]` 공개 페이지에서 견적서에 메시지를 남길 때 호출한다.
 * POST /decision과 동일하게 토큰이 가리키는 WebsiteOrder의 가장 최근 견적서 1건에만 적용한다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const text = typeof body === "object" && body !== null ? (body as Record<string, unknown>).body : undefined;
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return NextResponse.json({ success: false, error: "메시지 내용이 필요합니다." }, { status: 400 });
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ success: false, error: `메시지는 ${MAX_MESSAGE_LENGTH}자 이내로 입력해주세요.` }, { status: 400 });
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

  const updated = await addEstimateMessage(estimate.id, "client", trimmed);
  const client = await getClient(order.clientId);
  const companyName = client?.companyName || order.name;

  await notifyAdminOfEstimateActivity(
    "estimate.client_message",
    updated ?? estimate,
    companyName,
    `[CNBIZ] 견적서 문의 — ${companyName}`,
    [`고객사: ${companyName}`, `메시지: ${trimmed}`]
  );

  return NextResponse.json({ success: true, estimate: updated });
}
