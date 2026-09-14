"use client";

import { useEffect, useState } from "react";
import type { InquiryRecord } from "@/lib/inquiries/types";

/**
 * 견적서·기능명세서·프로젝트 일정·계약서·제안서는 생성 시점 의뢰의 회사명을 스냅샷으로 고정
 * 저장한다(계약서처럼 법적 문서는 나중에 회사명이 바뀌어도 계약 당시 내용을 그대로 유지해야
 * 하므로 의도된 설계) — 그 탓에 나중에 의뢰 정보에서 회사명을 정정하면, 이미 만든 문서
 * 목록에는 예전 이름이 그대로 남아 실사용 중 혼란을 준다("사색찬미한정식" 기능 명세서가
 * 목록에 "cnbiz"로 표시되어 못 찾은 사례, 2026-09-14). 문서 목록 화면들이 각 레코드의 스냅샷
 * 회사명과 연결된 의뢰의 "지금" 회사명을 비교해 안내 배지를 붙일 수 있도록, 의뢰 id → 현재
 * 회사명 맵을 한 번만 불러와 공유한다.
 */
export function useInquiryCompanyNames(): Map<string, string> {
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/inquiries")
        .then((res) => res.json())
        .then((json: { inquiries?: InquiryRecord[] }) => {
          const map = new Map<string, string>();
          for (const inquiry of json.inquiries ?? []) {
            map.set(inquiry.id, inquiry.companyName || inquiry.contactName);
          }
          setNames(map);
        })
        .catch(() => {
          // 배지는 보조 정보일 뿐 목록 자체의 필수 데이터가 아니다 — 실패해도 조용히 무시하고
          // 빈 맵을 유지한다(배지가 안 뜰 뿐, 목록 표시 자체에는 영향 없음).
        });
    });
  }, []);

  return names;
}

/** 스냅샷 회사명이 의뢰의 현재 회사명과 달라졌는지 확인한다. 현재 이름을 아직 못 불러왔으면
 * (맵에 없으면) 섣불리 "다르다"고 표시하지 않는다. */
export function isCompanyNameStale(currentName: string | undefined, snapshotName: string): boolean {
  if (!currentName) return false;
  return currentName.trim().toLowerCase() !== snapshotName.trim().toLowerCase();
}
