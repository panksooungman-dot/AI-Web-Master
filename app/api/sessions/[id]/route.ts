import { NextResponse } from "next/server";
import { sessionManager } from "@/lib/agents/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = sessionManager.getSession(id);

  if (!session) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ session, history: sessionManager.getHistory(id) });
}
