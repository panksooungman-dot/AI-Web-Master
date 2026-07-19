import { NextResponse } from "next/server";
import { getWebsiteOrder, updateWebsiteOrderStatus } from "@/lib/websiteOrders/registry";
import { WEBSITE_ORDER_STATUSES, type WebsiteOrderStatus } from "@/lib/websiteOrders/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isWebsiteOrderStatus(value: unknown): value is WebsiteOrderStatus {
  return typeof value === "string" && (WEBSITE_ORDER_STATUSES as string[]).includes(value);
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getWebsiteOrder(id);

  if (!record) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ websiteOrder: record });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const status = typeof body === "object" && body !== null ? (body as Record<string, unknown>).status : undefined;

  if (!isWebsiteOrderStatus(status)) {
    return NextResponse.json(
      { success: false, error: `status는 ${WEBSITE_ORDER_STATUSES.join(", ")} 중 하나여야 합니다.` },
      { status: 400 },
    );
  }

  const record = await updateWebsiteOrderStatus(id, status);

  if (!record) {
    return NextResponse.json({ success: false, error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, websiteOrder: record });
}
