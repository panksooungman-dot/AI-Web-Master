import { NextResponse } from "next/server";
import { stopDevServer } from "@/lib/devserver/manager";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let cwd = "";

  try {
    const body: unknown = await request.json();
    cwd = isRecord(body) && typeof body.cwd === "string" ? body.cwd : "";
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!cwd.trim()) {
    return NextResponse.json(
      { success: false, error: "프로젝트 경로가 필요합니다." },
      { status: 400 }
    );
  }

  const result = await stopDevServer(cwd);

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
