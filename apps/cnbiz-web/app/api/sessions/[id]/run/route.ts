import { NextResponse } from "next/server";
import { sessionManager } from "@/lib/agents/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
    }

    const agentId = stringField(body, "agentId");
    const prompt = stringField(body, "prompt");

    if (!agentId || !prompt) {
      return NextResponse.json(
        { success: false, error: "agentId·prompt는 필수입니다." },
        { status: 400 }
      );
    }

    const task = sessionManager.runInSession(id, agentId, prompt);

    return NextResponse.json({ success: true, task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
