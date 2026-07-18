import { NextResponse } from "next/server";
import { getRequest, updateRequestStatus } from "@/lib/requests/registry";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/requests/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && (REQUEST_STATUSES as string[]).includes(value);
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getRequest(id);

  if (!record) {
    return NextResponse.json({ error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ request: record });
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

  if (!isRequestStatus(status)) {
    return NextResponse.json(
      { success: false, error: `status는 ${REQUEST_STATUSES.join(", ")} 중 하나여야 합니다.` },
      { status: 400 }
    );
  }

  const record = await updateRequestStatus(id, status);

  if (!record) {
    return NextResponse.json({ success: false, error: "의뢰를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, request: record });
}
