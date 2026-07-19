import { NextResponse } from "next/server";
import { getInquiry, updateInquiryStatus } from "@/lib/inquiries/registry";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/inquiries/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === "string" && (INQUIRY_STATUSES as string[]).includes(value);
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getInquiry(id);

  if (!record) {
    return NextResponse.json({ error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ inquiry: record });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const status = typeof body === "object" && body !== null ? (body as Record<string, unknown>).status : undefined;

  if (!isInquiryStatus(status)) {
    return NextResponse.json(
      { success: false, error: `status는 ${INQUIRY_STATUSES.join(", ")} 중 하나여야 합니다.` },
      { status: 400 },
    );
  }

  const record = await updateInquiryStatus(id, status);

  if (!record) {
    return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, inquiry: record });
}
