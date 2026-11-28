import { buildRaiseBat } from "@/lib/contract/server/raise-script";
import { requireDepositViewer } from "@/lib/contract/server/deposits";

export const dynamic = "force-dynamic";

/** 포스기용 "입금 알림 큰 창을 포스 프로그램 위로 올리는 도우미" 설치 파일(.bat) 내려받기. 관리자 또는 등록된 매장 기기만 받을 수 있다. */
export async function GET(request: Request) {
  const denied = requireDepositViewer(request);
  if (denied) return denied;
  return new Response(buildRaiseBat(), {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": 'attachment; filename="deposit-raise-setup.bat"',
      "cache-control": "no-store",
    },
  });
}
