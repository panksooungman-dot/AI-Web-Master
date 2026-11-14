import { getAuthConfig, isAdminRequest } from "@/lib/contract/server/auth";
import { json } from "@/lib/contract/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cfg = getAuthConfig();
  return json({ ok: true, configured: cfg.configured, authenticated: isAdminRequest(request.headers.get("cookie"), cfg) });
}
