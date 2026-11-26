import { buildAutostartBat } from "@/lib/contract/server/autostart";
import { fail } from "@/lib/contract/server/http";
import { requireDepositViewer } from "@/lib/contract/server/deposits";

export const dynamic = "force-dynamic";

/** 포스기용 "부팅 시 입금 확인 화면 자동 실행" 설정 파일(.bat) 내려받기. 관리자 또는 등록된 매장 기기만 받을 수 있다. */
export async function GET(request: Request) {
  const denied = requireDepositViewer(request);
  if (denied) return denied;
  const bat = buildAutostartBat(new URL(request.url).origin);
  if (!bat) return fail(400, "설정 파일을 만들 수 없는 주소입니다.");
  return new Response(bat, {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": 'attachment; filename="deposit-autostart-setup.bat"',
      "cache-control": "no-store",
    },
  });
}
