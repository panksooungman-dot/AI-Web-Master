import { clearDeviceCookie, createDeviceToken, deviceCookie, isClockDevice } from "@/lib/contract/server/clock";
import { getAuthConfig } from "@/lib/contract/server/auth";
import { fail, guarded, json, requireAdmin, requireSameOrigin } from "@/lib/contract/server/http";

export const dynamic = "force-dynamic";

const secure = () => process.env.NODE_ENV === "production";

/** 이 브라우저가 출퇴근 기기로 등록돼 있는지. */
export async function GET(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    return json({ ok: true, registered: isClockDevice(request) });
  });
}

/** 이 브라우저를 출퇴근 기기로 등록한다(관리자 로그인 상태에서만). 쿠키는 180일 유지된다. */
export async function POST(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    const cfg = getAuthConfig();
    if (!cfg.secret) return fail(503, cfg.problem ?? "관리자 인증이 설정되지 않았습니다.");
    return json({ ok: true, registered: true }, 200, { "set-cookie": deviceCookie(createDeviceToken(cfg.secret), secure()) });
  });
}

/** 이 브라우저의 출퇴근 기기 등록을 해제한다. */
export async function DELETE(request: Request) {
  return guarded(async () => {
    const denied = requireAdmin(request) ?? requireSameOrigin(request);
    if (denied) return denied;
    return json({ ok: true, registered: false }, 200, { "set-cookie": clearDeviceCookie(secure()) });
  });
}
