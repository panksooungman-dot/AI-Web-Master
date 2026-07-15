import { NextResponse } from "next/server";
import { getDevServerStatus } from "@/lib/devserver/manager";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cwd = searchParams.get("cwd") ?? "";

  if (!cwd.trim()) {
    return NextResponse.json(
      { error: "프로젝트 경로가 필요합니다." },
      { status: 400 }
    );
  }

  const selfPort = Number(new URL(request.url).port) || null;

  return NextResponse.json(getDevServerStatus(cwd, selfPort));
}
