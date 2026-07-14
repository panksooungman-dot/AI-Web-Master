import { NextResponse } from "next/server";
import { deleteProject, getProject, touchProjectOpened } from "@/lib/projects/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const project = getProject(id);

  if (!project) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const project = touchProjectOpened(id);

  if (!project) {
    return NextResponse.json(
      { success: false, error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, project });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const deleted = deleteProject(id);

  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
