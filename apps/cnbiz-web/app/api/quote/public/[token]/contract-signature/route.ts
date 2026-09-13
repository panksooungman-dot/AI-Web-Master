import { NextResponse } from "next/server";
import { getWebsiteOrderByShareToken } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { listContractsByInquiry, recordContractClientSignature } from "@/lib/contracts/registry";
import { notifyAdminOfContractSignature } from "@/lib/contracts/notify";

interface RouteParams {
  params: Promise<{ token: string }>;
}

const MAX_IMAGE_DATA_URL_LENGTH = 2_000_000; // ~1.4MB 디코딩 기준 — 손 그림 서명 하나에 충분히 넉넉한 상한

/**
 * 의뢰자가 `/quote/[token]/contract` 공개 페이지에서 캔버스에 그린 서명을 제출할 때 호출한다.
 * 로그인 없이 토큰만으로 동작하므로(`/api/quote/public` prefix, lib/auth/rbac.ts에서 게이팅
 * 제외) 토큰이 가리키는 WebsiteOrder의 가장 최근 계약서 1건에만 적용한다 — GET·decision·message와
 * 동일한 "지금 공유하는 최신 버전" 원칙. 재서명(계약 조건이 바뀌어 다시 서명해야 하는 경우)도
 * 별도 제한 없이 허용한다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const obj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const imageDataUrl = obj.imageDataUrl;
  const signerName = obj.signerName;

  if (typeof signerName !== "string" || signerName.trim().length === 0) {
    return NextResponse.json({ success: false, error: "서명자 이름을 입력해주세요." }, { status: 400 });
  }
  if (
    typeof imageDataUrl !== "string" ||
    !imageDataUrl.startsWith("data:image/png;base64,") ||
    imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH
  ) {
    return NextResponse.json({ success: false, error: "서명 이미지가 올바르지 않습니다." }, { status: 400 });
  }

  const order = await getWebsiteOrderByShareToken(token);
  if (!order) {
    return NextResponse.json({ success: false, error: "문서를 찾을 수 없습니다." }, { status: 404 });
  }

  const contracts = await listContractsByInquiry(order.inquiryId);
  const contract = contracts[0];
  if (!contract) {
    return NextResponse.json({ success: false, error: "계약서를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await recordContractClientSignature(contract.id, {
    imageDataUrl,
    signerName: signerName.trim(),
    signedAt: new Date().toISOString(),
  });

  const client = await getClient(order.clientId);
  const companyName = client?.companyName || order.name;

  await notifyAdminOfContractSignature(updated ?? contract, companyName, signerName.trim());

  return NextResponse.json({ success: true, contract: updated });
}
