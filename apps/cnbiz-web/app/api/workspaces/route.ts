import { NextResponse } from "next/server";
import { createWorkspace, listWorkspaces } from "@/lib/workspaces/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ workspaces: listWorkspaces() });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const name =
      isRecord(body) && typeof body.name === "string" ? body.name.trim() : "";
    const targetPath =
      isRecord(body) && typeof body.path === "string" ? body.path.trim() : "";

    if (!name || !targetPath) {
      return NextResponse.json(
        { success: false, error: "이름과 경로를 모두 입력하세요." },
        { status: 400 }
      );
    }

    const workspace = createWorkspace(name, targetPath);

    return NextResponse.json({ success: true, workspace });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace 생성 실패";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
