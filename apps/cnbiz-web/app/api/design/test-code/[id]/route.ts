import { NextResponse } from "next/server";
import { getTestCode } from "@/lib/design/test-code";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getTestCode(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Test Code "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    testCodeId: record.id,
    testPlanId: record.testPlanId,
    backendCodeId: record.backendCodeId,
    projectId: record.planId,
    files: record.content.files,
    testCode: record,
  });
}
