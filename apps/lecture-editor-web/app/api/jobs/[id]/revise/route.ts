import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/registry";
import { processRevision } from "@/lib/jobs/runner";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ success: false, error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }
  if (job.status !== "done" && job.status !== "error") {
    return NextResponse.json({ success: false, error: "아직 처리 중입니다. 완료 후 수정 요청이 가능합니다." }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const instruction = typeof (body as { instruction?: unknown })?.instruction === "string"
    ? (body as { instruction: string }).instruction.trim()
    : "";
  if (!instruction) {
    return NextResponse.json({ success: false, error: "수정 지시 내용을 입력해주세요." }, { status: 400 });
  }

  void processRevision(id, instruction);

  return NextResponse.json({ success: true });
}
