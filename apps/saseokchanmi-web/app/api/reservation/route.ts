import { NextRequest, NextResponse } from "next/server";
import { hasFieldErrors, validateReservationInput } from "@/lib/reservation/validate";
import { saveReservation } from "@/lib/reservation/store";
import { getClientIp, isHoneypotFilled, isRateLimited } from "@/lib/reservation/spam";
import type { ReservationInput } from "@/lib/reservation/types";

export async function POST(request: NextRequest) {
  let body: Partial<ReservationInput>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  // 봇이 채우는 숨김 필드가 채워져 있으면 저장 없이 성공 응답만 돌려준다(탐지 사실을 알리지 않음).
  if (isHoneypotFilled(body.company)) {
    return NextResponse.json({ success: true });
  }

  const ip = getClientIp(request.headers);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const input: ReservationInput = {
    name: body.name ?? "",
    phone: body.phone ?? "",
    visitDate: body.visitDate ?? "",
    visitTime: body.visitTime ?? "",
    partySize: body.partySize ?? "",
    message: body.message ?? "",
  };

  const errors = validateReservationInput(input);
  if (hasFieldErrors(errors)) {
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  const record = saveReservation(input);

  return NextResponse.json({ success: true, id: record.id });
}
