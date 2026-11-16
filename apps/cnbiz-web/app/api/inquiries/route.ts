import { after, NextResponse } from "next/server";
import type { InquiryInput } from "@/lib/inquiries/types";
import { parseInquiryInput, validateInquiryInput } from "@/lib/inquiries/validate";
import {
  createInquiry,
  linkInquiryToClientAndOrder,
  listInquiries,
  saveInquiryAnalysis,
} from "@/lib/inquiries/registry";
import { getClientIp, isRateLimited } from "@/lib/inquiries/spam";
import {
  notifyAdminOfNewInquiry,
  notifyAdminOfNewInquirySlack,
  notifyAdminOfNewInquirySolapi,
} from "@/lib/inquiries/notify";
import { addInquiryToClient, addWebsiteOrderToClient, findOrCreateClient } from "@/lib/clients/registry";
import { addAiJobToWebsiteOrder, createWebsiteOrder } from "@/lib/websiteOrders/registry";
import { createAiJob } from "@/lib/aiJobs/registry";
import { generateAnalysis } from "@/lib/ai-analysis/analysis";

// AI 호출 1회가 최대 2분(providers/provider.ts의 DEFAULT_TIMEOUT_MS)까지 걸릴 수 있고,
// generateAnalysis()는 기본 재시도 정책(최대 3회)까지 그대로 쓰므로 누적 최대 약 361초가 걸릴
// 수 있다. app/api/design/* 라우트들이 이미 겪은 것과 동일한 원인(참고:
// app/api/design/requirements/route.ts) — maxDuration 미설정 시 Vercel 기본 상한에 걸려 정상
// JSON 대신 타임아웃 에러 페이지가 반환되고, 클라이언트(ContactForm.tsx)가 이를 파싱하지
// 못해 "문의 접수 중 오류가 발생했습니다" 원시 catch 오류로 보인다(실 production 재현: 문의
// 내용에 참고 사이트 URL을 포함해 제출하면 매번 이 오류가 발생). 이 라우트는 generateAnalysis()
// 내부에서 chatViaCli()를 호출하는데도 maxDuration이 누락돼 있던 것이 원인이다. Vercel Pro
// 기본 상한인 300초로 맞춘다.
export const maxDuration = 300;

/**
 * AI Analysis Engine — 독립적이라 실패해도(Provider 미설정 등은 generateAnalysis() 내부에서
 * 이미 결정론적 폴백으로 처리되므로 여기 catch는 진짜 예외 상황만 대비) Inquiry 접수 자체에는
 * 영향이 없다. 기존 외부 라우트와 동일한 격리 원칙.
 */
async function runAiAnalysis(inquiryId: string, input: InquiryInput): Promise<void> {
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
      referenceUrls: input.referenceUrls,
      codeSnippets: input.codeSnippets,
    });
    await saveInquiryAnalysis(inquiryId, analysisOutcome.result);
  } catch (error) {
    console.error("[api/inquiries] AI analysis failed", error);
  }
}

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

  try {
    return await receiveInquiry(input);
  } catch (error) {
    // 어떤 단계에서 예외가 나도 정상 JSON으로 응답한다 — 예외를 그대로 던지면 Next.js가 JSON이
    // 아닌 에러 페이지를 반환해 ContactForm이 파싱하지 못하고 원인 없는 범용 오류만 보여준다.
    console.error("[api/inquiries] intake failed", error);
    return NextResponse.json(
      { success: false, error: "문의 접수 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}

async function receiveInquiry(input: InquiryInput) {
  const inquiry = await createInquiry(input);

  const client = await findOrCreateClient({
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
  // Release Readiness Audit — Major #1: WebsiteOrderRecord.aiJobIds가 항상 빈 배열로 남던 결함
  // 수정. addAiJobToWebsiteOrder()는 이미 존재했으나 여기서 호출되지 않고 있었다(테스트에서만
  // 호출됨). addWebsiteOrderToClient()/addInquiryToClient()와 동일한 "생성 직후 부모 레코드에
  // 역참조 추가" 패턴을 그대로 따른다.
  await addAiJobToWebsiteOrder(websiteOrder.id, aiJob.id);

  const linkedInquiry = await linkInquiryToClientAndOrder(inquiry.id, client.id, websiteOrder.id);

  // 고객 응답을 막지 않아야 하는 느린 작업(AI 분석은 최대 수 분, 알림은 외부 API 호출)은
  // 응답을 보낸 뒤 실행한다. 이전에는 응답 전에 await해서, 느려지면 Vercel 실행 시간 상한에 걸려
  // JSON 대신 타임아웃 페이지가 반환되고 고객에게는 "문의 접수 중 오류"로 보였다(Inquiry·Client·
  // WebsiteOrder·AiJob은 이미 저장된 뒤라 접수 자체는 유실되지 않는다). 실행 시간은 이 라우트의
  // maxDuration(위)이 그대로 적용된다.
  after(async () => {
    await Promise.all([
      runAiAnalysis(inquiry.id, input),
      // 이메일·Slack·SOLAPI 세 채널 모두 시도한다 — 서로 독립적이며 한쪽이 실패해도 다른 쪽에
      // 영향을 주지 않는다(각 함수 내부에서 이미 자체 try/catch로 Audit Log에 결과를 기록함).
      notifyAdminOfNewInquiry(inquiry, client, websiteOrder).catch((error) => {
        console.error("[api/inquiries] admin email notification failed", error);
      }),
      notifyAdminOfNewInquirySlack(inquiry, client, websiteOrder).catch((error) => {
        console.error("[api/inquiries] admin slack notification failed", error);
      }),
      notifyAdminOfNewInquirySolapi(inquiry, client, websiteOrder).catch((error) => {
        console.error("[api/inquiries] admin solapi notification failed", error);
      }),
    ]);
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
