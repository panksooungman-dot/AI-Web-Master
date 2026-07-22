import { NextResponse } from "next/server";
import { createInquiry, linkInquiryToClientAndOrder, listInquiries, saveInquiryAnalysis } from "@/lib/inquiries/registry";
import { parseInquiryInput, validateInquiryInput } from "@/lib/inquiries/validate";
import { notifyAdminOfNewInquiry } from "@/lib/inquiries/notify";
import { addInquiryToClient, addWebsiteOrderToClient, findOrCreateClientByEmail } from "@/lib/clients/registry";
import { createWebsiteOrder } from "@/lib/websiteOrders/registry";
import { createAiJob } from "@/lib/aiJobs/registry";
import { processJob } from "@/lib/aiJobs/worker";
import { generateAnalysis } from "@/lib/ai-analysis/analysis";

/** Admin-only (RBAC default: /api/inquiries is not in UNGATED_API_PREFIXES). Lists newest first. */
export async function GET() {
  return NextResponse.json({ inquiries: await listInquiries() });
}

/**
 * 관리자가 /developer/inquiries/new에서 수동으로 접수하는 경로 — 지금까지 이 화면의
 * "AI 분석 시작" 버튼이 console.log만 남기고 아무 레코드도 만들지 않던 끊긴 연결부였다.
 * POST /api/external/inquiries(cnbiz.ai.kr 챗봇 전용, x-api-key 인증)가 이미 구현해 둔
 * Inquiry→AI Analysis→Client→WebsiteOrder→AiJob→AI Job 실행→관리자 알림 파이프라인을
 * 그대로 재사용한다(새 Registry/CollectionStore/API/Workflow Engine/AI Analysis/Website
 * Order 로직 없음, source만 "manual"로 고정해 챗봇 접수와 구분). 이 라우트는 이미
 * "developer" 세션 게이팅을 받고 있어(proxy.ts + lib/auth/rbac.ts 기본 규칙) 별도 인증 코드가
 * 필요 없다 — 그래서 x-api-key가 아닌 관리자 전용 /api/inquiries에 추가한다.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const input = { ...parseInquiryInput(body), source: "manual" as const };
  const errors = validateInquiryInput(input);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  const inquiry = await createInquiry(input);

  // AI Analysis Engine 실패는(Provider 미설정 등은 generateAnalysis() 내부에서 이미 결정론적
  // 폴백으로 처리됨) 이 요청 자체(Inquiry 접수·AiJob 실행)를 막지 않는다 — 외부 라우트와 동일한
  // 격리 원칙.
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
    console.error("[inquiries] AI analysis failed", error);
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

  const aiJob = await createAiJob({
    websiteOrderId: websiteOrder.id,
    type: "generate_website",
    payload: { siteType: input.siteType, requirements: input.requirements },
  });

  // processJob()은 내부적으로 모든 예외를 잡아 Job을 Failed로 기록하므로(worker.ts) 여기서
  // 실패해도 이 요청 자체(Inquiry 접수)는 실패하지 않는다 — 실패한 Job은 관리자가
  // /api/ai-jobs/[id]/run으로 재시도할 수 있다.
  await processJob(aiJob.id).catch((error) => {
    console.error("[inquiries] ai job execution failed", error);
  });

  const linkedInquiry = await linkInquiryToClientAndOrder(inquiry.id, client.id, websiteOrder.id);

  await notifyAdminOfNewInquiry(inquiry, client, websiteOrder).catch((error) => {
    console.error("[inquiries] admin notification failed", error);
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
