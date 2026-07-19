import { NextResponse } from "next/server";
import { verifyExternalApiKey } from "@/lib/auth/apiKey";
import { parseInquiryInput, validateInquiryInput } from "@/lib/inquiries/validate";
import { createInquiry, linkInquiryToClientAndOrder } from "@/lib/inquiries/registry";
import { getClientIp, isRateLimited } from "@/lib/inquiries/spam";
import { notifyAdminOfNewInquiry } from "@/lib/inquiries/notify";
import { addInquiryToClient, addWebsiteOrderToClient, findOrCreateClientByEmail } from "@/lib/clients/registry";
import { createWebsiteOrder } from "@/lib/websiteOrders/registry";
import { createAiJob } from "@/lib/aiJobs/registry";

/**
 * cnbiz.ai.kr 프로젝트 AI 챗봇이 서버-투-서버로 호출하는 단일 진입점 — 새 제작의뢰 UI를
 * 만들지 않고, 이미 존재하는 챗봇 대화 결과를 여기로 넘겨받아
 * Inquiry → Client(find-or-create) → WebsiteOrder → AiJob → 관리자 알림까지 한 번에 처리한다.
 *
 * lib/auth/rbac.ts의 UNGATED_API_PREFIXES에 "/api/external"이 등록되어 있어 세션(role)
 * 게이팅은 없다 — 대신 verifyExternalApiKey()가 이 라우트의 유일한 인증 수단이다.
 * GET/PATCH로 이 데이터를 조회·관리하는 관리자 API는 /api/inquiries·/api/clients·
 * /api/website-orders·/api/ai-jobs에 별도로 있으며, 그쪽은 기본 "developer" 세션 게이팅을
 * 그대로 받는다(이 라우트와 절대 경로가 겹치지 않음).
 */
export async function POST(request: Request) {
  if (!verifyExternalApiKey(request)) {
    return NextResponse.json({ success: false, error: "인증에 실패했습니다." }, { status: 401 });
  }

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const input = parseInquiryInput(body);
  const errors = validateInquiryInput(input);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  const inquiry = await createInquiry(input);

  const client = await findOrCreateClientByEmail({
    companyName: input.companyName,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
  });
  await addInquiryToClient(client.id, inquiry.id);

  const websiteOrder = await createWebsiteOrder({
    clientId: client.id,
    inquiryId: inquiry.id,
    name: input.companyName ? `${input.companyName} 홈페이지 제작` : `${input.contactName}님 홈페이지 제작`,
    siteType: input.siteType,
    requirements: input.requirements,
    budget: input.budget,
  });
  await addWebsiteOrderToClient(client.id, websiteOrder.id);

  const aiJob = await createAiJob({
    websiteOrderId: websiteOrder.id,
    type: "generate_website",
    payload: { siteType: input.siteType, requirements: input.requirements },
  });

  await linkInquiryToClientAndOrder(inquiry.id, client.id, websiteOrder.id);

  // 알림 실패가 이미 저장된 파이프라인 결과를 무효화하지 않도록 별도로 격리한다.
  await notifyAdminOfNewInquiry(inquiry, client, websiteOrder).catch((error) => {
    console.error("[external-inquiries] admin notification failed", error);
  });

  return NextResponse.json(
    {
      success: true,
      inquiryId: inquiry.id,
      clientId: client.id,
      websiteOrderId: websiteOrder.id,
      aiJobId: aiJob.id,
    },
    { status: 200 },
  );
}
