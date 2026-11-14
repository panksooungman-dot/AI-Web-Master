import { clearLoginFailures, clientKey, fail, guarded, json, loginLockSeconds, readJson, recordLoginFailure, requireSameOrigin } from "@/lib/contract/server/http";
import { createSessionToken, getAuthConfig, passwordMatches, sessionCookie } from "@/lib/contract/server/auth";
import { getStore } from "@/lib/contract/server/select";

export const dynamic = "force-dynamic";

/** 관리자 로그인. 15분 안에 5번 틀리면 15분간 잠근다. */
export async function POST(request: Request) {
  return guarded(async () => {
    const blocked = requireSameOrigin(request);
    if (blocked) return blocked;
    const cfg = getAuthConfig();
    if (!cfg.configured || !cfg.password || !cfg.secret) return fail(503, cfg.problem ?? "관리자 인증이 설정되지 않았습니다.");

    const parsed = await readJson(request, 2000);
    if (!parsed.ok) return parsed.response;
    const password = (parsed.body as { password?: unknown } | null)?.password;
    if (typeof password !== "string" || password.length === 0 || password.length > 200) return fail(400, "비밀번호를 입력해 주세요.");

    const store = getStore();
    const key = clientKey(request);
    const wait = await loginLockSeconds(store, key);
    if (wait > 0) return fail(429, `로그인 시도가 너무 많습니다. ${Math.ceil(wait / 60)}분 뒤에 다시 시도해 주세요.`);

    if (!passwordMatches(password, cfg.password)) {
      await recordLoginFailure(store, key);
      return fail(401, "비밀번호가 올바르지 않습니다.");
    }
    await clearLoginFailures(store, key);
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(createSessionToken(cfg.secret), process.env.NODE_ENV === "production") });
  });
}
