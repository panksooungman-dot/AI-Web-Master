import { NextResponse } from "next/server";
import { getEstimate, updateEstimateDocument } from "@/lib/estimates/registry";
import type { EstimateDocumentDetails } from "@/lib/estimates/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const estimate = await getEstimate(id);

  if (!estimate) {
    return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ estimate });
}

/** 견적서 문서 양식(건명·유효기간·제안금액·참고사항·공급자 정보 등)의 편집 가능 필드를 저장한다. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const document =
    typeof body === "object" && body !== null
      ? ((body as Record<string, unknown>).document as EstimateDocumentDetails | undefined)
      : undefined;

  if (!document || typeof document !== "object") {
    return NextResponse.json({ success: false, error: "document 필드가 필요합니다." }, { status: 400 });
  }

  const record = await updateEstimateDocument(id, document);

  if (!record) {
    return NextResponse.json({ success: false, error: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, estimate: record });
}
