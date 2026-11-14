import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthConfig, SESSION_COOKIE, verifySessionToken } from "./auth";

/** 관리자 페이지(서버 컴포넌트)에서 매 요청 세션을 확인한다. 없으면 로그인 화면으로 보낸다. */
export async function requireAdminPage(): Promise<void> {
  const cfg = getAuthConfig();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cfg.configured || !cfg.secret || !verifySessionToken(token, cfg.secret)) redirect("/admin/login");
}
