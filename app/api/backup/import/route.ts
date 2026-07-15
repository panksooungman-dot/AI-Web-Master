import { NextResponse } from "next/server";
import { importBackup } from "@/lib/backup/registry";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const result = importBackup(body);

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
