import { NextResponse } from "next/server";
import { parseRequestInput, validateRequestInput } from "@/lib/requests/validate";
import { createRequest } from "@/lib/requests/registry";
import { getClientIp, isHoneypotFilled, isRateLimited } from "@/lib/requests/spam";

/**
 * Public endpoint — anonymous site visitors submit here with no session (see
 * lib/auth/rbac.ts's UNGATED_API_PREFIXES). Admin-only read/update lives at
 * /api/requests and /api/requests/[id], which stay RBAC-gated by default.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, errors: { message: "요청 형식이 올바르지 않습니다." } },
      { status: 400 },
    );
  }

  // Bots that fill every field get a fake success — no save, no tell.
  if (isHoneypotFilled(body)) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { success: false, errors: { message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." } },
      { status: 429 },
    );
  }

  const input = parseRequestInput(body);
  const errors = validateRequestInput(input);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  const record = await createRequest(input);

  return NextResponse.json({ success: true, id: record.id }, { status: 200 });
}
