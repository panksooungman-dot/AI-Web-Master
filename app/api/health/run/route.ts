import { NextResponse } from "next/server";
import { runHealthCheck, writeHealthCacheEntry, type HealthCheckId } from "@/lib/health/checks";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

const VALID_CHECKS: HealthCheckId[] = ["build", "test", "coverage"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const check = isRecord(body) && typeof body.check === "string" ? body.check : "";

  if (!VALID_CHECKS.includes(check as HealthCheckId)) {
    return NextResponse.json(
      { success: false, error: `check는 ${VALID_CHECKS.join("|")} 중 하나여야 합니다.` },
      { status: 400 }
    );
  }

  const result = await runHealthCheck(check as HealthCheckId, process.cwd());
  writeHealthCacheEntry(check as HealthCheckId, result);

  if (check === "build") {
    const actor = await getCurrentActorEmail();
    recordAuditEvent({
      action: "build.run",
      actor,
      success: result.success,
      detail: result.success ? "빌드 성공" : result.summary,
    });
    incrementMetric("buildCount");
  }

  return NextResponse.json({ success: true, result });
}
