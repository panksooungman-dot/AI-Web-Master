import { NextResponse } from "next/server";
import { generateClaudeDesign } from "@/lib/design/claude-design-generator";
import { createClaudeDesign, listClaudeDesigns } from "@/lib/design/claude-design";
import { getPrototype } from "@/lib/design/prototype";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ claudeDesigns: listClaudeDesigns() });
}

/**
 * `POST /api/design/claude` — Design Automation Phase 5. Phase 4의 PrototypeRecord(`prototypeId`)
 * 위에서 Design/UI/Component/Theme/Layout Prompt 5종을 생성한다. 응답은 Dashboard가 필요로 하는
 * 5종 프롬프트를 최상위에 그대로 노출하고, 전체 레코드는 `claudeDesign` 필드로 확장한다(Phase
 * 2~4의 `storyboard`/`wireframe`/`prototype` 필드와 동일한 확장 방식).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const prototypeId = isRecord(body) && typeof body.prototypeId === "string" ? body.prototypeId.trim() : "";

  if (!prototypeId) {
    return NextResponse.json({ success: false, error: "prototypeId는 필수입니다." }, { status: 400 });
  }

  const prototype = getPrototype(prototypeId);
  if (!prototype) {
    return NextResponse.json(
      { success: false, error: `Prototype "${prototypeId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const { content, simulated, provider, model } = await generateClaudeDesign(prototype);
  const record = createClaudeDesign({
    prototypeId,
    planId: prototype.planId,
    content,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  recordAuditEvent({
    action: "design.claude.generate",
    actor,
    success: true,
    detail: `Claude Design Prompt 생성: Prototype "${prototypeId}"${simulated ? " (simulated)" : ""}`,
  });
  incrementMetric("claudeDesignGenerationCount");

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
