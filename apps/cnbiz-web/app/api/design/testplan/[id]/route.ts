import { NextResponse } from "next/server";
import { getTestPlan } from "@/lib/design/testplan-design";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getTestPlan(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Test Plan "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    testPlanId: record.id,
    backendDesignId: record.backendDesignId,
    projectId: record.planId,
    testCases: record.content.testCases,
    testPlan: record,
  });
}
