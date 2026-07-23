import { NextResponse } from "next/server";
import { executePrompt, executePromptInSession } from "@/lib/prompts/executor";

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
    const sessionId = stringField(body, "sessionId") || undefined;
    const version = typeof body.version === "number" ? body.version : undefined;

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: "agentId는 필수입니다." },
        { status: 400 }
      );
    }

    if (sessionId) {
      const task = await executePromptInSession(id, sessionId, agentId, version);
      return NextResponse.json({ success: true, task });
    }

    const cwd = stringField(body, "cwd");
    const workspaceId = stringField(body, "workspaceId") || undefined;
    const workspaceName = stringField(body, "workspaceName") || undefined;

    if (!cwd) {
      return NextResponse.json(
        { success: false, error: "sessionId가 없다면 cwd가 필요합니다." },
        { status: 400 }
      );
    }

    const task = await executePrompt(id, agentId, { cwd, workspaceId, workspaceName }, version);

    return NextResponse.json({ success: true, task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
