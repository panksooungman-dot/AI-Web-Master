import { NextResponse } from "next/server";
import { getPrototype } from "@/lib/design/prototype";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** docs/03_DESIGN 스펙의 `GET /api/design/prototype/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = getPrototype(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Prototype "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

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
