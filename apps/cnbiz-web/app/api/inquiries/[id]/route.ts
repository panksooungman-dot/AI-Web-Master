import { NextResponse } from "next/server";
import { deleteInquiry, getInquiry, updateInquiry, updateInquiryStatus } from "@/lib/inquiries/registry";
import { INQUIRY_STATUSES, type InquiryInput, type InquiryStatus } from "@/lib/inquiries/types";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === "string" && (INQUIRY_STATUSES as string[]).includes(value);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EDITABLE_FIELDS = [
  "companyName",
  "contactName",
  "email",
  "phone",
  "siteType",
  "requirements",
  "budget",
  "industry",
] as const satisfies readonly (keyof InquiryInput)[];

type EditablePatch = Partial<Pick<InquiryInput, (typeof EDITABLE_FIELDS)[number]>>;

function pickEditablePatch(body: Record<string, unknown>): EditablePatch {
  const patch: EditablePatch = {};
  for (const key of EDITABLE_FIELDS) {
    if (typeof body[key] === "string") {
      patch[key] = body[key].trim();
    }
  }
  return patch;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getInquiry(id);

  if (!record) {
    return NextResponse.json({ error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ inquiry: record });
}

/**
 * `status` 필드가 있으면 기존 상태 변경(updateInquiryStatus)을, 그 외 편집 가능한 필드(회사명·
 * 담당자·이메일 등)가 있으면 정보 수정(updateInquiry)을 수행한다 — 하나의 PATCH 엔드포인트를
 * 재사용하고 새 라우트를 만들지 않는다.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (typeof body.status !== "undefined") {
    if (!isInquiryStatus(body.status)) {
      return NextResponse.json(
        { success: false, error: `status는 ${INQUIRY_STATUSES.join(", ")} 중 하나여야 합니다.` },
        { status: 400 },
      );
    }

    const record = await updateInquiryStatus(id, body.status);
    if (!record) {
      return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, inquiry: record });
  }

  const patch = pickEditablePatch(body);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: "수정할 필드가 없습니다." }, { status: 400 });
  }

  if (patch.companyName !== undefined && !patch.companyName) {
    return NextResponse.json({ success: false, error: "회사명은 비울 수 없습니다." }, { status: 400 });
  }

  if (patch.contactName !== undefined && !patch.contactName) {
    return NextResponse.json({ success: false, error: "담당자명은 비울 수 없습니다." }, { status: 400 });
  }

  if (patch.email !== undefined && !EMAIL_PATTERN.test(patch.email)) {
    return NextResponse.json({ success: false, error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }

  const record = await updateInquiry(id, patch);

  if (!record) {
    return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "inquiry.update",
    actor,
    success: true,
    detail: `"${record.companyName || record.contactName}" 정보 수정`,
    metadata: { inquiryId: record.id, fields: Object.keys(patch) },
  });

  return NextResponse.json({ success: true, inquiry: record });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getInquiry(id);

  if (!record) {
    return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteInquiry(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "inquiry.delete",
    actor,
    success: true,
    detail: `"${record.companyName || record.contactName}" 삭제`,
    metadata: { inquiryId: id },
  });

  return NextResponse.json({ success: true });
}
