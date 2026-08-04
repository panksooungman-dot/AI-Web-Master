import { NextResponse } from "next/server";
import { getProposal } from "@/lib/proposals/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const proposal = await getProposal(id);

  if (!proposal) {
    return NextResponse.json({ error: "제안서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ proposal });
}
