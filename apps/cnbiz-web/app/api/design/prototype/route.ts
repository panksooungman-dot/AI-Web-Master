import { NextResponse } from "next/server";
import { generatePrototype } from "@/lib/design/prototype-generator";
import { createPrototype, listPrototypes } from "@/lib/design/prototype";
import { getWireframe } from "@/lib/design/wireframe";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ prototypes: await listPrototypes() });
}

/**
 * docs/03_DESIGN 스펙의 `POST /api/design/prototype`. Phase 3의 WireframeRecord(`wireframeId`)
 * 위에서 Click Flow·Navigation Flow·Screen Transition·Interaction Map·Component Actions·
 * User Journey·Animation Preview·Prototype Preview를 생성한다. 응답은 스펙이 명시한
 * `{ prototypeId, projectId, screens, interactions, transitions, journey, preview }`를 그대로
 * 포함하고, Dashboard가 필요로 하는 나머지 상세(clickFlows/navigationFlow/componentActions/
 * animationPreviews)는 `prototype` 필드로 확장한다(Phase 2·3의 `storyboard`/`wireframe` 필드와
 * 동일한 확장 방식).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const wireframeId = isRecord(body) && typeof body.wireframeId === "string" ? body.wireframeId.trim() : "";

  if (!wireframeId) {
    return NextResponse.json({ success: false, error: "wireframeId는 필수입니다." }, { status: 400 });
  }

  const wireframe = await getWireframe(wireframeId);
  if (!wireframe) {
    return NextResponse.json(
      { success: false, error: `Wireframe "${wireframeId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const { content, simulated, provider, model } = await generatePrototype(wireframe);
  const record = await createPrototype({
    wireframeId,
    planId: wireframe.planId,
    content,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.prototype.generate",
    actor,
    success: true,
    detail: `Prototype 생성(v${record.version}): Wireframe "${wireframeId}"${simulated ? " (simulated)" : ""}`,
  });
  await incrementMetric("prototypeGenerationCount");

  return NextResponse.json({
    success: true,
    prototypeId: record.id,
    projectId: record.planId,
    screens: record.content.screens,
    interactions: record.content.interactionMap,
    transitions: record.content.screenTransitions,
    journey: record.content.userJourneys,
    preview: record.content.preview,
    prototype: record,
  });
}
