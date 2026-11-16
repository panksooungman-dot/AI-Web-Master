import { NextResponse } from "next/server";
import { getInquiry, saveInquiryAnalysis } from "@/lib/inquiries/registry";
import { generateAnalysis } from "@/lib/ai-analysis/analysis";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// app/api/inquiries/route.ts와 동일한 이유(generateAnalysis() 내부의 chatViaCli() 호출이
// 최대 2분, 기본 재시도까지 포함하면 더 오래 걸릴 수 있음) — maxDuration 미설정 시 Vercel 기본
// 상한에 걸려 "재분석" 클릭이 타임아웃 에러로 실패할 수 있어 Vercel Pro 기본 상한인 300초로 맞춘다.
export const maxDuration = 300;

/**
 * AI 분석(lib/ai-analysis)을 이 Inquiry의 현재 필드 값으로 다시 실행한다 — 신규 접수 시
 * app/api/inquiries/route.ts가 자동 실행하는 것과 동일한 generateAnalysis()를 그대로
 * 재사용한다. 새 분석 엔진이 아니라 "다시 실행" 트리거만 추가한 것 — 정보 수정(PATCH) 이후
 * 최신 값으로 재분석하고 싶을 때, 또는 최초 분석이 실패/기본값으로 대체됐을 때 쓴다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const inquiry = await getInquiry(id);

  if (!inquiry) {
    return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const outcome = await generateAnalysis({
      companyName: inquiry.companyName,
      contactName: inquiry.contactName,
      email: inquiry.email,
      phone: inquiry.phone,
      siteType: inquiry.siteType,
      requirements: inquiry.requirements,
      industry: inquiry.industry,
      survey: inquiry.survey,
      uploadedFiles: inquiry.uploadedFiles,
      referenceUrls: inquiry.referenceUrls,
      codeSnippets: inquiry.codeSnippets,
    });

    const record = await saveInquiryAnalysis(id, outcome.result);

    const actor = await getCurrentActorEmail();
    await recordAuditEvent({
      action: "inquiry.analyze",
      actor,
      success: true,
      detail: `"${inquiry.companyName || inquiry.contactName}" 재분석${outcome.simulated ? " (simulated)" : ""}`,
      metadata: { inquiryId: id },
    });

    return NextResponse.json({ success: true, inquiry: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "재분석 중 오류가 발생했습니다.";

    const actor = await getCurrentActorEmail();
    await recordAuditEvent({
      action: "inquiry.analyze",
      actor,
      success: false,
      detail: message,
      metadata: { inquiryId: id },
    });

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
