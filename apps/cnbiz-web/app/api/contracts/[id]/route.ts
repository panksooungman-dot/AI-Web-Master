import { NextResponse } from "next/server";
import { getContract } from "@/lib/contracts/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const contract = await getContract(id);

  if (!contract) {
    return NextResponse.json({ error: "계약서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ contract });
}
