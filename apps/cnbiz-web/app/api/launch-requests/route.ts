import { NextResponse } from "next/server";
import { getInquiry } from "@/lib/inquiries/registry";
import { createLaunchRequest, listLaunchRequests } from "@/lib/launchRequests/registry";
import { LAUNCH_REQUEST_CATALOG, getLaunchRequestCatalogItem } from "@/lib/launchRequests/catalog";
import type { LaunchRequestServiceSelection } from "@/lib/launchRequests/types";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

/**
 * 정보 요청서(Launch Request) — 개발 착수 후 의뢰자에게 계정·API 키 정보를 요청하는 문서.
 * lib/estimates 등 AI 생성 체인과 달리 AI를 호출하지 않는다 — 관리자가 catalog.ts의 고정 목록 중
 * 실제 필요한 서비스만 체크박스로 골라 이 레코드를 만든다(생성은 여기서만, developer 로그인 필요).
 * 조회는 두 경로로 나뉜다 — 이 목록 API(GET, developer 전용, /developer/launch-requests 목록용)와
 * app/api/launch-requests/public/[id]/route.ts(GET, 비로그인 공개, 의뢰자가 여는 링크용).
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isServiceSelectionArray(value: unknown): value is LaunchRequestServiceSelection[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.serviceId === "string" &&
        Boolean(getLaunchRequestCatalogItem(item.serviceId)) &&
        typeof item.required === "boolean"
    )
  );
}

export async function GET() {
  return NextResponse.json({ launchRequests: await listLaunchRequests() });
}

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

  if (!isServiceSelectionArray(body.services)) {
    return NextResponse.json(
      { success: false, error: "최소 1개 이상의 유효한 서비스를 선택해야 합니다." },
      { status: 400 }
    );
  }

  const inquiryId = body.inquiryId.trim();
  const inquiry = await getInquiry(inquiryId);

  if (!inquiry) {
    return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  const record = await createLaunchRequest({
    inquiryId: inquiry.id,
    companyName: inquiry.companyName || inquiry.contactName,
    services: body.services,
  });

  const actor = await getCurrentActorEmail();
  const serviceNames = record.services
    .map((selection) => getLaunchRequestCatalogItem(selection.serviceId)?.name ?? selection.serviceId)
    .join(", ");
  await recordAuditEvent({
    action: "launchRequest.generate",
    actor,
    success: true,
    detail: `정보 요청서 생성: "${record.companyName}" (${serviceNames})`,
    metadata: { inquiryId: inquiry.id, launchRequestId: record.id, catalogSize: LAUNCH_REQUEST_CATALOG.length },
  });
  await incrementMetric("launchRequestGenerationCount");

  return NextResponse.json({ success: true, launchRequest: record });
}
