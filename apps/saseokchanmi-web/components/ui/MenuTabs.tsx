"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@cnbiz/utils";
import { TodoBadge } from "@/components/ui/TodoBadge";
import type { MenuItem } from "@/lib/content";

/**
 * 네이버플레이스 메뉴 탭(추천 메뉴/솥밥정식/추가메뉴)을 참고한 카테고리 필터.
 * 다만 "추천 메뉴"는 매장이 실제로 지정한 적이 없는 항목이라 지어내지 않고, 우리가 실제로
 * 가진 두 카테고리(솥밥정식·추가메뉴)에 "전체" 탭을 더한 3탭 구성으로 만든다.
 */
type TabKey = "all" | "signature" | "additional";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "signature", label: "솥밥정식" },
  { key: "additional", label: "추가메뉴" },
];

function MenuRow({ item, index, fallbackLabel }: { item: MenuItem; index: number; fallbackLabel: string }) {
  const label = item.name ?? `${fallbackLabel} ${index + 1}`;
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {item.image && (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary/40">
          <Image src={item.image} alt={label} fill sizes="96px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {item.name ? (
          <>
            <p className="font-semibold text-foreground">{item.name}</p>
            {item.price && <p className="mt-0.5 text-sm font-semibold text-primary">{item.price}</p>}
          </>
        ) : (
          <TodoBadge label={item.todo ?? "확인 필요"} />
        )}
        {item.description && <p className="mt-1 line-clamp-1 text-sm text-muted">{item.description}</p>}
      </div>
    </div>
  );
}

function MenuGroup({ title, note, items, fallbackLabel }: {
  title: string;
  note?: string;
  items: MenuItem[];
  fallbackLabel: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      {note && <p className="mt-2 text-sm leading-relaxed text-muted">{note}</p>}
      <div className="mt-6 divide-y divide-secondary overflow-hidden rounded-xl border border-secondary">
        {items.map((item, index) => (
          <MenuRow key={index} item={item} index={index} fallbackLabel={fallbackLabel} />
        ))}
      </div>
    </div>
  );
}

export function MenuTabs({
  signatureMenu,
  additionalMenu,
}: {
  signatureMenu: MenuItem[];
  additionalMenu: MenuItem[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="메뉴 카테고리">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full border px-5 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "border-foreground bg-foreground text-white"
                  : "border-secondary bg-white text-muted hover:border-primary/40 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 space-y-16">
        {(activeTab === "all" || activeTab === "signature") && (
          <MenuGroup title="솥밥정식" items={signatureMenu} fallbackLabel="대표 메뉴" />
        )}
        {(activeTab === "all" || activeTab === "additional") && (
          <MenuGroup
            title="추가메뉴"
            note="정식은 1인 가격이며 2인 이상 주문하실 수 있습니다. 세 분 이상 오셨거나 더 푸짐하게 즐기고 싶다면 아래 추가메뉴로 넉넉하게 채워 보세요."
            items={additionalMenu}
            fallbackLabel="메뉴"
          />
        )}
      </div>
    </div>
  );
}
