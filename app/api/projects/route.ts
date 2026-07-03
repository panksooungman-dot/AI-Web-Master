import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/projects/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

export async function GET() {
  return NextResponse.json({ projects: listProjects() });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json(
        { success: false, error: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    const name = stringField(body, "name");
    const company = stringField(body, "company");
    const type = stringField(body, "type");
    const description = stringField(body, "description");
    const workspaceId = stringField(body, "workspaceId");
    const workspaceName = stringField(body, "workspaceName");
    const workspacePath = stringField(body, "workspacePath");

    if (!name || !company || !type || !workspaceId || !workspaceName || !workspacePath) {
      return NextResponse.json(
        { success: false, error: "필수 항목을 모두 입력하세요." },
        { status: 400 }
      );
    }

    const project = createProject({
      name,
      company,
      type,
      description,
      workspaceId,
      workspaceName,
      workspacePath,
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "프로젝트 생성 실패";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
