import { NextResponse } from "next/server";
import { sessionManager } from "@/lib/agents/session";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

export async function GET() {
  return NextResponse.json({ sessions: sessionManager.listSessions() });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
    }

    const workspaceId = stringField(body, "workspaceId");
    const workspaceName = stringField(body, "workspaceName");
    const workspacePath = stringField(body, "workspacePath");

    if (!workspaceId || !workspaceName || !workspacePath) {
      return NextResponse.json(
        { success: false, error: "workspaceId·workspaceName·workspacePath는 필수입니다." },
        { status: 400 }
      );
    }

    const session = sessionManager.createSession({ workspaceId, workspaceName, workspacePath });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
