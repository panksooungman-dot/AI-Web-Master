import fs from "fs";
import { NextResponse } from "next/server";
import { detectProjectHealth } from "@/lib/projects/detect";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderPath = searchParams.get("path");

  if (!folderPath) {
    return NextResponse.json({ error: "path 쿼리 파라미터는 필수입니다." }, { status: 400 });
  }

  if (!fs.existsSync(folderPath)) {
    return NextResponse.json({ error: "폴더를 찾을 수 없습니다." }, { status: 404 });
  }

  const health = await detectProjectHealth(folderPath);

  return NextResponse.json({ health });
}
