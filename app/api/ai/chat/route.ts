import { NextResponse } from "next/server";
import { chatViaCli } from "@/lib/ai/bridge";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? (body[key] as string).trim() : "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const message = str(body, "message");

  if (!message) {
    return NextResponse.json({ success: false, error: "message는 필수입니다." }, { status: 400 });
  }

  const system = str(body, "system") || undefined;
  const provider = str(body, "provider") || undefined;

  const result = await chatViaCli(message, { system, provider });

  const actor = await getCurrentActorEmail();
  recordAuditEvent({
    action: "ai.task",
    actor,
    success: result.success,
    detail: result.success ? `Chat: "${message.slice(0, 60)}"` : result.error ?? "Chat 실행 실패",
  });
  incrementMetric("aiTaskCount");

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
