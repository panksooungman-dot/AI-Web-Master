import { NextResponse } from "next/server";
import { listAuditEvents } from "@/lib/audit/log";

/**
 * 요구사항 — 중앙 Error Report. 별도 에러 저장소를 새로 만들지 않고, Audit Log(lib/audit/log.ts)에서
 * success:false인 항목만 걸러 보여준다 — 로그인 실패·Marketplace publish/install/remove 실패·
 * Website 생성 실패·AI Task 실패·Build 실패가 전부 이 한 곳에 모인다.
 */
export async function GET() {
  const entries = listAuditEvents({ failuresOnly: true });
  return NextResponse.json({ entries });
}
