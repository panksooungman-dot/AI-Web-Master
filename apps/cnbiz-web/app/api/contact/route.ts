import { NextResponse } from "next/server";
import { parseContactInput, validateContactInput } from "@/lib/contact/validate";
import { saveContactSubmission } from "@/lib/contact/store";
import { notifyContactSubmission } from "@/lib/contact/notify";
import { getClientIp, isHoneypotFilled, isRateLimited } from "@/lib/contact/spam";

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

  // Bots that fill every field get a fake success — no save, no email, no tell.
  if (isHoneypotFilled(body)) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { success: false, errors: { message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." } },
      { status: 429 },
    );
  }

  const input = parseContactInput(body);
  const errors = validateContactInput(input);

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  const submission = saveContactSubmission(input);
  await notifyContactSubmission(submission);

  return NextResponse.json({ success: true }, { status: 200 });
}
