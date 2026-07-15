import { NextResponse } from "next/server";
import { getClaudeDesign } from "@/lib/design/claude-design";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `GET /api/design/claude/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = getClaudeDesign(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Claude Design "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    claudeDesignId: record.id,
    projectId: record.planId,
    designPrompt: record.content.designPrompt,
    uiPrompt: record.content.uiPrompt,
    componentPrompt: record.content.componentPrompt,
    themePrompt: record.content.themePrompt,
    layoutPrompt: record.content.layoutPrompt,
    claudeDesign: record,
  });
}
