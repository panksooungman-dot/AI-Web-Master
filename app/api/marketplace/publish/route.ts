import { NextResponse } from "next/server";
import { publishPackages } from "@/lib/marketplace/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    // 본문이 없으면(전체 게시) 빈 객체로 처리한다.
  }

  const name = isRecord(body) && typeof body.name === "string" ? body.name.trim() || undefined : undefined;

  const { success, outcome, error } = await publishPackages(name);

  if (!success) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...outcome });
}
