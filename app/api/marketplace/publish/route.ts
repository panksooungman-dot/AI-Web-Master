import { NextResponse } from "next/server";
import { publishPackages } from "@/lib/marketplace/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

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
  const actor = await getCurrentActorEmail();

  if (!success) {
    recordAuditEvent({ action: "marketplace.publish", actor, success: false, detail: error ?? "게시 실패" });
    return NextResponse.json({ success: false, error }, { status: 500 });
  }

  recordAuditEvent({
    action: "marketplace.publish",
    actor,
    success: true,
    detail: `${outcome?.published.length ?? 0}개 게시${name ? ` (${name})` : ""}`,
  });

  return NextResponse.json({ success: true, ...outcome });
}
