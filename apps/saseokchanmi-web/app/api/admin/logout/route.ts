import { clearSessionCookie } from "@/lib/contract/server/auth";
import { guarded, json, requireSameOrigin } from "@/lib/contract/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return guarded(async () => {
    const blocked = requireSameOrigin(request);
    if (blocked) return blocked;
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(process.env.NODE_ENV === "production") });
  });
}
