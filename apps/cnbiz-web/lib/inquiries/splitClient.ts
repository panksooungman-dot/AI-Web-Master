/**
 * app/api/inquiries/[id]/split-client/route.ts 전용 순수 오케스트레이션. cookies()를 쓰지
 * 않아(감사 로그 actor는 route.ts에서 별도로 기록) vitest로 직접 테스트할 수 있다.
 *
 * 두 가지 실사용 상황을 모두 이 함수 하나로 고친다 — 둘 다 "이 의뢰는 자기 자신의 정보와
 * 일치하는 Client에 연결되어 있어야 한다"는 같은 결과로 수렴하기 때문.
 * 1. 잘못 합쳐짐(2026-09-13, 최초 발견) — findOrCreateClient()가 이메일만으로 Client를
 *    매칭하던 시절(2026-09-12 수정 이전)에 접수된 의뢰는 같은 담당자 이메일을 쓰는 다른 회사
 *    문의와 하나의 Client에 합쳐진 채 남아있다("사색찬미한정식"이 "cnbiz" Client에 합쳐짐).
 * 2. Client 자체가 사라짐(2026-09-13, 같은 날 재현) — lib/clients/registry.ts의 옛
 *    list()+push()+replaceAll() 패턴이 서로 다른 서버리스 인스턴스의 동시 쓰기와 경합해, 방금
 *    만든 Client가 다른 요청의 늦은 replaceAll()에 지워지는 사고가 실제로 발생했다(WebsiteOrder·
 *    AiJob·Project Workspace는 전부 정상 생성됐는데 Client만 "생성 전"으로 보임). 근본 원인은
 *    registry.ts를 setDoc() 기반 단일 행 upsert로 고쳤지만, 이미 이렇게 끊어진 기존 레코드는
 *    관리자가 이 복구 버튼으로 직접 되살려야 한다.
 *
 * 두 상황 모두 이 의뢰만 자기 정보(companyName/contactName/email/phone)로 된 새(또는 이미
 * 일치하는) Client로 옮기고, 연결된 WebsiteOrder도 함께 옮긴다. 옛 Client가 아예 없었던
 * 경우(2번)는 정리할 역참조도 없으므로 그 단계만 건너뛴다.
 */

import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import {
  addInquiryToClient,
  addWebsiteOrderToClient,
  findOrCreateClient,
  getClient,
  removeInquiryFromClient,
  removeWebsiteOrderFromClient,
} from "@/lib/clients/registry";
import { getInquiry, reassignInquiryClient } from "@/lib/inquiries/registry";
import { reassignWebsiteOrderClient } from "@/lib/websiteOrders/registry";
import type { ClientRecord } from "@/lib/clients/types";

export type SplitInquiryFromClientResult =
  | { success: true; changed: boolean; client: ClientRecord }
  | { success: false; error: string };

export async function splitInquiryFromClient(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<SplitInquiryFromClientResult> {
  const inquiry = await getInquiry(inquiryId, store);
  if (!inquiry) {
    return { success: false, error: "의뢰를 찾을 수 없습니다." };
  }

  // clientId가 아예 없거나(파이프라인이 Client 단계 전에 멈춤) 가리키는 Client 자체가
  // 사라졌으면(위 2번 상황) 정리할 옛 Client가 없다는 뜻 — undefined로 두고 아래에서
  // "옛 Client 역참조 정리" 단계만 건너뛴다. 둘 다 에러로 취급하지 않는다.
  const oldClient = inquiry.clientId ? await getClient(inquiry.clientId, store) : undefined;

  // 이메일+회사명이 모두 일치하는 Client를 찾거나 새로 만든다 — 같은 회사의 다른 의뢰를 여러 번
  // "분리/복구"해도 매번 새 Client가 생기지 않고 하나로 모인다.
  const newClient = await findOrCreateClient(
    {
      companyName: inquiry.companyName,
      contactName: inquiry.contactName,
      email: inquiry.email,
      phone: inquiry.phone,
    },
    store
  );

  if (oldClient && newClient.id === oldClient.id) {
    // 이미 이 의뢰 자신의 정보와 정확히 일치하는 Client에 연결되어 있다 — 손댈 필요 없음.
    return { success: true, changed: false, client: oldClient };
  }

  await reassignInquiryClient(inquiryId, newClient.id, store);
  let updatedClient = await addInquiryToClient(newClient.id, inquiryId, store);
  if (oldClient) {
    await removeInquiryFromClient(oldClient.id, inquiryId, store);
  }

  if (inquiry.websiteOrderId) {
    await reassignWebsiteOrderClient(inquiry.websiteOrderId, newClient.id, store);
    updatedClient = await addWebsiteOrderToClient(newClient.id, inquiry.websiteOrderId, store);
    if (oldClient) {
      await removeWebsiteOrderFromClient(oldClient.id, inquiry.websiteOrderId, store);
    }
  }

  return { success: true, changed: true, client: updatedClient ?? newClient };
}
