import { NextResponse } from "next/server";
import { verifyExternalApiKey } from "@/lib/auth/apiKey";
import { parseInquiryInput, validateInquiryInput } from "@/lib/inquiries/validate";
import { createInquiry, linkInquiryToClientAndOrder, saveInquiryAnalysis } from "@/lib/inquiries/registry";
import { getClientIp, isRateLimited } from "@/lib/inquiries/spam";
import { notifyAdminOfNewInquiry } from "@/lib/inquiries/notify";
import { addInquiryToClient, addWebsiteOrderToClient, findOrCreateClientByEmail } from "@/lib/clients/registry";
import { createWebsiteOrder } from "@/lib/websiteOrders/registry";
import { createAiJob } from "@/lib/aiJobs/registry";
import { processJob } from "@/lib/aiJobs/worker";
import { generateAnalysis } from "@/lib/ai-analysis/analysis";

/**
 * @deprecated AI Business OS Rewiring (see REWIRING_REPORT.md) — this route was built for
 * cnbiz.ai.kr's chatbot to call server-to-server, but CHATBOT_API_KEY was never configured in
 * Production (fail-closed → every request here would 401) and no confirmed real caller was ever
 * found. Customer intake has been rewired through `POST /api/inquiries`
 * (app/api/inquiries/route.ts, no API key, same createInquiry()-based orchestration minus the
 * auto-run of the AiJob) — cnbiz.kr's own /contact form and the /developer/inquiries/new admin
 * form both call that route now. This route is left in place, still fully functional, only for
 * backward compatibility in case an external caller does exist after all; remove it in a separate
 * commit once that's confirmed not to be the case.
 *
 * cnbiz.ai.kr 프로젝트 AI 챗봇이 서버-투-서버로 호출하는 단일 진입점 — 새 제작의뢰 UI를
 * 만들지 않고, 이미 존재하는 챗봇 대화 결과를 여기로 넘겨받아
 * Inquiry → Client(find-or-create) → WebsiteOrder → AiJob → 관리자 알림까지 한 번에 처리한다.
 *
 * lib/auth/rbac.ts의 UNGATED_API_PREFIXES에 "/api/external"이 등록되어 있어 세션(role)
 * 게이팅은 없다 — 대신 verifyExternalApiKey()가 이 라우트의 유일한 인증 수단이다.
 * GET/PATCH로 이 데이터를 조회·관리하는 관리자 API는 /api/inquiries·/api/clients·
 * /api/website-orders·/api/ai-jobs에 별도로 있으며, 그쪽은 기본 "developer" 세션 게이팅을
 * 그대로 받는다(이 라우트와 절대 경로가 겹치지 않음).
 *
 * customerName/consultation/industry/survey/uploadedFiles 필드는
 * lib/inquiries/validate.ts의 parseInquiryInput()이 기존 contactName/requirements와 함께
 * 그대로 파싱한다(스키마는 그대로 두고 옵셔널 필드만 추가 — 아래 참고).
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

  // 아키텍처 SSOT(CNBIZ.KR → CNBIZ.AI.KR → AI Business OS)상 "Inquiry 저장"은 CNBIZ.AI.KR의
  // 책임이다. CNBIZ.AI.KR이 아직 이 저장을 자체적으로 하지 않아(2026-07-21 확인), AI Business OS가
  // 그 책임을 임시로 대행하고 있다 — CNBIZ.AI.KR이 자체 DB에 Inquiry/설문/첨부파일을 저장하도록
  // 구축되면, 이 호출은 "CNBIZ.AI.KR이 이미 저장한 Inquiry를 참조/수신"하는 형태로 이관되어야
  // 한다(PROJECT_STATUS.md 참고). 그 전까지는 기존 동작을 그대로 유지한다(삭제·이동 금지).
  const inquiry = await createInquiry(input);

  // AI Business OS Phase 2 — AI Analysis Engine(lib/ai-analysis). Client/WebsiteOrder/AiJob
  // 파이프라인과 독립적이라 실패해도(Provider 미설정 등은 generateAnalysis() 내부에서 이미
  // 결정론적 폴백으로 처리되므로 여기 catch는 진짜 예외 상황만 대비) 이 요청 자체(Inquiry
  // 접수·AiJob 실행)를 막지 않는다. 새 컬렉션을 만들지 않고 기존 inquiries 레코드에 저장.
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
    console.error("[external-inquiries] AI analysis failed", error);
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

  // AiJob은 Queued로 생성될 뿐 이를 실행할 스케줄러/cron이 없어 그대로 방치되던 문제의
  // 연결부 — 생성 직후 곧바로 실행한다. processJob()은 내부적으로 모든 예외를 잡아 Job을
  // Failed로 기록하므로(worker.ts) 여기서 실패해도 이 요청 자체(Inquiry 접수)는 실패하지
  // 않는다. 실패한 Job은 관리자가 /api/ai-jobs/[id]/run으로 재시도할 수 있다.
  await processJob(aiJob.id).catch((error) => {
    console.error("[external-inquiries] ai job execution failed", error);
  });

  const linkedInquiry = await linkInquiryToClientAndOrder(inquiry.id, client.id, websiteOrder.id);

  // 아키텍처 SSOT상 "관리자 알림"도 CNBIZ.AI.KR의 책임이다 — 위 Inquiry 저장과 동일한 이유로
  // CNBIZ.AI.KR 구축 전까지 AI Business OS가 임시 대행 중(PROJECT_STATUS.md 참고).
  // 알림 실패가 이미 저장된 파이프라인 결과를 무효화하지 않도록 별도로 격리한다.
  await notifyAdminOfNewInquiry(inquiry, client, websiteOrder).catch((error) => {
    console.error("[external-inquiries] admin notification failed", error);
  });

  return NextResponse.json(
    {
      success: true,
      inquiryId: inquiry.id,
      // 기존 InquiryStatus("New"|"Qualified"|"Converted"|"Rejected")를 그대로 노출한다.
      // processJob()을 여기서 await하는 기존 설계상 응답 시점엔 이미 파이프라인이 끝나있어
      // "Converted"로 돌아오는 것이 정상 — 진행 중 상태(Queued/Running)는 관리자 화면
      // (/developer/inquiries)에서 아이템을 열면 연결된 AiJob의 실시간 status로 확인한다.
      status: linkedInquiry?.status ?? inquiry.status,
      clientId: client.id,
      websiteOrderId: websiteOrder.id,
      aiJobId: aiJob.id,
    },
    { status: 200 },
  );
}
