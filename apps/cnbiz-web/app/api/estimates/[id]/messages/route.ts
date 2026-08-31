import { NextResponse } from "next/server";
import { addEstimateMessage } from "@/lib/estimates/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_MESSAGE_LENGTH = 2000;

/** 관리자가 견적서 메시지 스레드에 직접 답장한다. `/api/estimates/[id]`와 동일하게 "developer" 게이팅. */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const text = typeof body === "object" && body !== null ? (body as Record<string, unknown>).body : undefined;
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return NextResponse.json({ success: false, error: "메시지 내용이 필요합니다." }, { status: 400 });
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ success: false, error: `메시지는 ${MAX_MESSAGE_LENGTH}자 이내로 입력해주세요.` }, { status: 400 });
  }

  const record = await addEstimateMessage(id, "admin", trimmed);
  if (!record) {
    return NextResponse.json({ success: false, error: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, estimate: record });
}
