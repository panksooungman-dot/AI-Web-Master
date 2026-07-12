import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactRequestBody {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  /** Honeypot field — real visitors never fill this in. */
  company?: unknown;
}

export async function POST(request: Request) {
  let body: ContactRequestBody;

  try {
    body = (await request.json()) as ContactRequestBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, message, company } = body;

  if (typeof company === "string" && company.trim().length > 0) {
    // Bot filled the hidden field — pretend success without processing or logging.
    return NextResponse.json({ success: true });
  }

  const errors: string[] = [];
  if (typeof name !== "string" || name.trim().length === 0) errors.push("Name is required.");
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) errors.push("A valid email is required.");
  if (typeof message !== "string" || message.trim().length === 0) errors.push("Message is required.");

  if (errors.length > 0) {
    return NextResponse.json({ success: false, error: errors.join(" ") }, { status: 400 });
  }

  // Wire up an email provider here (see .env.example) to deliver this to your inbox.
  console.log(`[contact] ${String(name)} <${String(email)}>: ${String(message)}`);

  return NextResponse.json({ success: true });
}
