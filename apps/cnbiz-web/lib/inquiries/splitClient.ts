/**
 * app/api/inquiries/[id]/split-client/route.ts 전용 순수 오케스트레이션. cookies()를 쓰지
 * 않아(감사 로그 actor는 route.ts에서 별도로 기록) vitest로 직접 테스트할 수 있다.
 *
 * 배경(2026-09-13): findOrCreateClient()가 이메일만으로 Client를 매칭하던 시절(2026-09-12
 * 수정 이전)에 접수된 의뢰들은, 같은 담당자 이메일을 쓰는 서로 다른 회사 문의가 하나의 Client로
 * 잘못 합쳐진 채 남아있다(실사용 재현: "사색찬미한정식" 문의가 "cnbiz" Client에 합쳐져, 그
 * Client의 연락처(전화번호)를 고쳐도 서로 다른 회사가 뒤섞여 있어 문자 공유 등 기능이
 * 제대로 동작하지 않음). 이 함수는 그 의뢰 하나를 골라 자기 자신의 연락처 정보(companyName/
 * contactName/email/phone)로 새 Client를 만들거나 이미 일치하는 Client가 있으면 재사용해,
 * 그 의뢰와(있다면) 연결된 WebsiteOrder를 옮긴다.
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

  if (!inquiry.clientId) {
    return { success: false, error: "연결된 고객사가 없습니다." };
  }

  const oldClient = await getClient(inquiry.clientId, store);
  if (!oldClient) {
    return { success: false, error: "연결된 고객사 정보를 찾을 수 없습니다." };
  }

  // 이메일+회사명이 모두 일치하는 Client를 찾거나 새로 만든다 — 같은 회사의 다른 의뢰를 여러 번
  // "분리"해도 매번 새 Client가 생기지 않고 하나로 모인다.
  const newClient = await findOrCreateClient(
    {
      companyName: inquiry.companyName,
      contactName: inquiry.contactName,
      email: inquiry.email,
      phone: inquiry.phone,
    },
    store
  );

  if (newClient.id === oldClient.id) {
    // 이미 이 의뢰 자신의 정보와 정확히 일치하는 Client에 연결되어 있다 — 분리할 필요 없음.
    return { success: true, changed: false, client: oldClient };
  }

  await reassignInquiryClient(inquiryId, newClient.id, store);
  let updatedClient = await addInquiryToClient(newClient.id, inquiryId, store);
  await removeInquiryFromClient(oldClient.id, inquiryId, store);

  if (inquiry.websiteOrderId) {
    await reassignWebsiteOrderClient(inquiry.websiteOrderId, newClient.id, store);
    updatedClient = await addWebsiteOrderToClient(newClient.id, inquiry.websiteOrderId, store);
    await removeWebsiteOrderFromClient(oldClient.id, inquiry.websiteOrderId, store);
  }

  return { success: true, changed: true, client: updatedClient ?? newClient };
}
