import { NextResponse } from "next/server";
import { generateSpecification } from "@/lib/specifications/generator";
import { createSpecification, listSpecifications } from "@/lib/specifications/registry";
import type { SpecificationInput } from "@/lib/specifications/types";
import { getInquiry } from "@/lib/inquiries/registry";
import { getWebsiteOrder } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ specifications: await listSpecifications() });
}

/**
 * PROJECT_STATUS.md가 명시한 확장 지점 — AI Analysis Engine(lib/ai-analysis)의 AIAnalysisResult를
 * 입력으로 사용하는 "별도 서비스"로 구현했다(lib/estimates와 완전히 동일한 패턴, AiJobType 추가
 * 방식 대신). Customer Inquiry Pipeline(processJob()·AiJobType·AiJobStatus 등)은 전혀 건드리지
 * 않는다 — 이 라우트는 Inquiry.analysis(이미 자동 생성되어 있음)를 읽기만 한다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.inquiryId !== "string" || !body.inquiryId.trim()) {
    return NextResponse.json({ success: false, error: "inquiryId는 필수입니다." }, { status: 400 });
  }

  const inquiryId = body.inquiryId.trim();
  const inquiry = await getInquiry(inquiryId);

  if (!inquiry) {
    return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!inquiry.analysis) {
    return NextResponse.json(
      { success: false, error: "AI 분석이 아직 완료되지 않았습니다. 분석 완료 후 다시 시도하세요." },
      { status: 400 }
    );
  }

  if (!inquiry.websiteOrderId) {
    return NextResponse.json(
      { success: false, error: "이 의뢰에 연결된 WebsiteOrder가 없습니다." },
      { status: 400 }
    );
  }

  const websiteOrder = await getWebsiteOrder(inquiry.websiteOrderId);
  const client = websiteOrder ? await getClient(websiteOrder.clientId) : undefined;

  const input: SpecificationInput = {
    companyName: client?.companyName || inquiry.companyName || client?.contactName || inquiry.contactName,
    detectedBusinessType: inquiry.analysis.detectedBusinessType,
    recommendedPages: inquiry.analysis.recommendedPages,
    recommendedFunctions: inquiry.analysis.recommendedFunctions,
    requirements: inquiry.requirements,
  };

  const { result, simulated, provider, model } = await generateSpecification(input);

  const record = await createSpecification({
    inquiryId: inquiry.id,
    websiteOrderId: inquiry.websiteOrderId,
    input,
    result,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "specification.generate",
    actor,
    success: true,
    detail: `기능 명세서 생성: "${input.companyName}" (페이지 ${result.pages.length}종, 기능 ${result.features.length}종)${simulated ? " (simulated)" : ""}`,
    metadata: { inquiryId: inquiry.id, websiteOrderId: inquiry.websiteOrderId, specificationId: record.id },
  });
  await incrementMetric("specificationGenerationCount");

  return NextResponse.json({ success: true, specification: record });
}
