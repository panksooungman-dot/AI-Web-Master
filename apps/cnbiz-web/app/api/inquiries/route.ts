import { NextResponse } from "next/server";
import { parseInquiryInput, validateInquiryInput } from "@/lib/inquiries/validate";
import {
  createInquiry,
  linkInquiryToClientAndOrder,
  listInquiries,
  saveInquiryAnalysis,
} from "@/lib/inquiries/registry";
import { getClientIp, isRateLimited } from "@/lib/inquiries/spam";
import { notifyAdminOfNewInquiry } from "@/lib/inquiries/notify";
import { addInquiryToClient, addWebsiteOrderToClient, findOrCreateClientByEmail } from "@/lib/clients/registry";
import { createWebsiteOrder } from "@/lib/websiteOrders/registry";
import { createAiJob } from "@/lib/aiJobs/registry";
import { generateAnalysis } from "@/lib/ai-analysis/analysis";

/** Admin-only (RBAC default: /api/inquiries is not in UNGATED_API_PREFIXES). Lists newest first. */
export async function GET() {
  return NextResponse.json({ inquiries: await listInquiries() });
}

/**
 * AI Business OS Rewiring — internal replacement intake point for the customer inquiry pipeline.
 * Reuses the exact orchestration that `app/api/external/inquiries/route.ts` (now Deprecated, see
 * that file) already had: Inquiry → AI Analysis → Client(find-or-create) → WebsiteOrder → AiJob →
 * admin notification. No new business logic — every function called below already existed and is
 * already covered by its own tests (tests/inquiries, tests/clients, tests/websiteOrders,
 * tests/aiJobs, tests/ai-analysis).
 *
 * Two deliberate differences from the deprecated external route:
 * 1. No `x-api-key` check — this route is meant to be called directly by cnbiz.kr's own contact
 *    form and by the /developer/inquiries/new admin form, both same-origin, no external caller.
 *    Ungated via lib/auth/rbac.ts's UNGATED_EXACT_ROUTES (POST /api/inquiries only — GET stays
 *    "developer"-gated for the admin listing above).
 * 2. Does NOT call processJob() automatically. The created AiJob is left "Queued" so an admin can
 *    review the AI Analysis result first and trigger generation deliberately — see the "승인"
 *    action on /developer/inquiries/[id] (AI Business OS Rewiring Phase 2), which calls the
 *    existing POST /api/ai-jobs/[id]/run (no new execution logic either).
 */
export async function POST(request: Request) {
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

  // AI Analysis Engine — 독립적이라 실패해도(Provider 미설정 등은 generateAnalysis() 내부에서
  // 이미 결정론적 폴백으로 처리되므로 여기 catch는 진짜 예외 상황만 대비) 이 요청 자체(Inquiry
  // 접수)를 막지 않는다. 기존 외부 라우트와 동일한 격리 원칙.
  try {
    const analysisOutcome = await generateAnalysis({
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      siteType: input.siteType,
      requirements: input.requirements,
      industry: input.industry,
      survey: input.survey,
      uploadedFiles: input.uploadedFiles,
    });
    await saveInquiryAnalysis(inquiry.id, analysisOutcome.result);
  } catch (error) {
    console.error("[api/inquiries] AI analysis failed", error);
  }

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

  // Queued로만 생성하고 여기서는 실행하지 않는다 — 관리자가 /developer/inquiries/[id]에서
  // AI 분석 결과를 확인한 뒤 "승인"을 눌러야 AiJob이 실행된다(Rewiring Phase 2 참고).
  const aiJob = await createAiJob({
    websiteOrderId: websiteOrder.id,
    type: "generate_website",
    payload: { siteType: input.siteType, requirements: input.requirements },
  });

  const linkedInquiry = await linkInquiryToClientAndOrder(inquiry.id, client.id, websiteOrder.id);

  await notifyAdminOfNewInquiry(inquiry, client, websiteOrder).catch((error) => {
    console.error("[api/inquiries] admin notification failed", error);
  });

  return NextResponse.json(
    {
      success: true,
      inquiryId: inquiry.id,
      status: linkedInquiry?.status ?? inquiry.status,
      clientId: client.id,
      websiteOrderId: websiteOrder.id,
      aiJobId: aiJob.id,
    },
    { status: 200 },
  );
}
