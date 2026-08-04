import { NextResponse } from "next/server";
import { generateProposal } from "@/lib/proposals/generator";
import { createProposal, listProposals } from "@/lib/proposals/registry";
import type { ProposalInput } from "@/lib/proposals/types";
import { getInquiry } from "@/lib/inquiries/registry";
import { getWebsiteOrder } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { listEstimatesByInquiry } from "@/lib/estimates/registry";
import { listSpecificationsByInquiry } from "@/lib/specifications/registry";
import { listTimelinesByInquiry } from "@/lib/timeline/registry";
import { listContractsByInquiry } from "@/lib/contracts/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ proposals: await listProposals() });
}

/**
 * Proposal은 자동 문서화 체인의 다음 단계 — AI Analysis Engine(lib/ai-analysis)뿐 아니라 이미
 * 생성된 EstimateRecord·SpecificationRecord·TimelineRecord·ContractRecord도 입력으로 사용하는
 * "별도 서비스"다(lib/estimates·lib/specifications·lib/timeline·lib/contracts와 완전히 동일한
 * 패턴, AiJobType 추가 방식 대신). 네 Domain의 registry 조회 함수만 읽기 전용으로 호출할 뿐,
 * 그 파일들은 전혀 건드리지 않는다. Customer Inquiry Pipeline(processJob()·AiJobType·
 * AiJobStatus 등)도 전혀 건드리지 않는다.
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

  const [estimates, specifications, timelines, contracts] = await Promise.all([
    listEstimatesByInquiry(inquiryId),
    listSpecificationsByInquiry(inquiryId),
    listTimelinesByInquiry(inquiryId),
    listContractsByInquiry(inquiryId),
  ]);

  const latestEstimate = estimates[0];
  const latestSpecification = specifications[0];
  const latestTimeline = timelines[0];
  const latestContract = contracts[0];

  if (!latestEstimate) {
    return NextResponse.json({ success: false, error: "먼저 기술 견적서를 생성하세요." }, { status: 400 });
  }

  if (!latestSpecification) {
    return NextResponse.json({ success: false, error: "먼저 기능 명세서를 생성하세요." }, { status: 400 });
  }

  if (!latestTimeline) {
    return NextResponse.json({ success: false, error: "먼저 프로젝트 일정을 생성하세요." }, { status: 400 });
  }

  if (!latestContract) {
    return NextResponse.json({ success: false, error: "먼저 계약서를 생성하세요." }, { status: 400 });
  }

  const websiteOrder = await getWebsiteOrder(inquiry.websiteOrderId);
  const client = websiteOrder ? await getClient(websiteOrder.clientId) : undefined;

  const input: ProposalInput = {
    companyName: client?.companyName || inquiry.companyName || client?.contactName || inquiry.contactName,
    detectedBusinessType: inquiry.analysis.detectedBusinessType,
    requirements: inquiry.requirements,
    pageNames: latestSpecification.result.pages.map((page) => page.name),
    featureNames: latestSpecification.result.features.map((feature) => feature.name),
    techStack: latestSpecification.result.techStack,
    scopeIncluded: latestSpecification.result.scopeIncluded,
    deliverables: latestSpecification.result.deliverables,
    priceRangeMin: latestEstimate.result.priceRangeMin,
    priceRangeMax: latestEstimate.result.priceRangeMax,
    currency: latestEstimate.result.currency,
    totalDurationWeeks: latestTimeline.result.totalDurationWeeks,
    totalDurationDays: latestTimeline.result.totalDurationDays,
    milestoneNames: latestTimeline.result.milestones.map((milestone) => milestone.name),
    contractAmount: latestContract.result.contractAmount.amount,
    maintenanceSummary: latestContract.result.maintenance,
  };

  const { result, simulated, provider, model } = await generateProposal(input);

  const record = await createProposal({
    inquiryId: inquiry.id,
    websiteOrderId: inquiry.websiteOrderId,
    estimateId: latestEstimate.id,
    specificationId: latestSpecification.id,
    timelineId: latestTimeline.id,
    contractId: latestContract.id,
    input,
    result,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "proposal.generate",
    actor,
    success: true,
    detail: `제안서 생성: "${input.companyName}" (${result.cost.amount.toLocaleString()}${result.cost.currency})${simulated ? " (simulated)" : ""}`,
    metadata: {
      inquiryId: inquiry.id,
      websiteOrderId: inquiry.websiteOrderId,
      estimateId: latestEstimate.id,
      specificationId: latestSpecification.id,
      timelineId: latestTimeline.id,
      contractId: latestContract.id,
      proposalId: record.id,
    },
  });
  await incrementMetric("proposalGenerationCount");

  return NextResponse.json({ success: true, proposal: record });
}
