import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NewsletterRequestBody {
  email?: unknown;
}

export async function POST(request: Request) {
  let body: NewsletterRequestBody;

  try {
    body = (await request.json()) as NewsletterRequestBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const { email } = body;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ success: false, error: "A valid email is required." }, { status: 400 });
  }

  // Wire up an email list provider here (see .env.example) to actually store subscribers.
  console.log(`[newsletter] New subscriber: ${email}`);

  return NextResponse.json({ success: true });
}
