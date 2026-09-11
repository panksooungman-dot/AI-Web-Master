import { NextResponse } from "next/server";
import { getWebsite } from "@/lib/websites/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const website = await getWebsite(id);

  if (!website) {
    return NextResponse.json({ error: "Website를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ website });
}
