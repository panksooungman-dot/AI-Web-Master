import { NextResponse } from "next/server";
import { verifyExternalApiKey } from "@/lib/auth/apiKey";
import { getClientIp, isRateLimited } from "@/lib/inquiries/spam";
import { getExternalInquiryStatus } from "@/lib/external/status";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @deprecated AI Business OS Rewiring (see REWIRING_REPORT.md) — same status as the sibling
 * POST route (app/api/external/inquiries/route.ts): never confirmed to have a real external
 * caller, kept only for backward compatibility. The internal replacement flow doesn't need a
 * separate polling endpoint — admins already see live AiJob status on
 * /developer/inquiries/[id] via the existing "developer"-gated GET /api/inquiries/[id].
 *
 * cnbiz.ai.kr 챗봇이 POST /api/external/inquiries 응답으로 받은 inquiryId를 그대로 넘겨
 * 진행 상태를 폴링하는 엔드포인트. 인증·요청 제한은 POST 라우트와 동일하게
 * verifyExternalApiKey()/isRateLimited()를 그대로 재사용한다(새 인증 로직 없음).
 *
 * 실제 상태 조합 로직은 lib/external/status.ts에 있다 — 이 라우트는 인증·요청 형식만 다룬다.
 */
export async function GET(request: Request, { params }: RouteParams) {
  if (!verifyExternalApiKey(request)) {
    return NextResponse.json({ success: false, error: "인증에 실패했습니다." }, { status: 401 });
  }

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const result = await getExternalInquiryStatus(id);

  if (!result) {
    return NextResponse.json({ success: false, error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, ...result });
}
