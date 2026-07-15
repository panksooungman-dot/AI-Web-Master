import { NextResponse } from "next/server";
import { generateWireframe } from "@/lib/design/wireframe-generator";
import { createWireframe, listWireframes } from "@/lib/design/wireframe";
import { getStoryboard } from "@/lib/design/storyboard";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ wireframes: await listWireframes() });
}

/**
 * docs/03_DESIGN 스펙의 `POST /api/design/wireframe`. Phase 2의 StoryboardRecord(`storyboardId`)
 * 위에서 Desktop/Tablet/Mobile Layout·Component Layout·Responsive Layout·Screen Sections을
 * 생성한다. 응답은 스펙이 명시한 `{ wireframeId, projectId, layouts, components, responsive }`를
 * 그대로 포함하고, Dashboard가 필요로 하는 전체 레코드는 `wireframe` 아래에 추가로 담는다
 * (Phase 2의 `storyboard` 필드와 동일한 확장 방식).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const storyboardId = isRecord(body) && typeof body.storyboardId === "string" ? body.storyboardId.trim() : "";

  if (!storyboardId) {
    return NextResponse.json({ success: false, error: "storyboardId는 필수입니다." }, { status: 400 });
  }

  const storyboard = await getStoryboard(storyboardId);
  if (!storyboard) {
    return NextResponse.json(
      { success: false, error: `Storyboard "${storyboardId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const { content, simulated, provider, model } = await generateWireframe(storyboard);
  const record = await createWireframe({ storyboardId, planId: storyboard.planId, content, simulated, provider, model });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.wireframe.generate",
    actor,
    success: true,
    detail: `Wireframe 생성: Storyboard "${storyboardId}"${simulated ? " (simulated)" : ""}`,
  });
  await incrementMetric("wireframeGenerationCount");

  return NextResponse.json({
    success: true,
    wireframeId: record.id,
    projectId: record.planId,
    layouts: record.content.layouts,
    components: record.content.components,
    responsive: record.content.responsive,
    wireframe: record,
  });
}
