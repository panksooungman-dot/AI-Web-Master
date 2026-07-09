"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/developer/Card";
import { componentMarker } from "@/lib/dev/component-marker";

export interface UiMapEntry {
  category: string;
  name: string;
  url: string;
  description: string;
  openUrl: string | null;
}

interface UiMapExplorerProps {
  entries: UiMapEntry[];
  categories: string[];
}

function entryKey(entry: UiMapEntry): string {
  return `${entry.category}-${entry.url}-${entry.name}`;
}

export function UiMapExplorer({ entries, categories }: UiMapExplorerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("전체");
  const [previewKeys, setPreviewKeys] = useState<Set<string>>(new Set());

  const togglePreview = (key: string) => {
    setPreviewKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return entries.filter((entry) => {
      if (activeCategory !== "전체" && entry.category !== activeCategory) return false;
      if (!q) return true;

      return (
        entry.name.toLowerCase().includes(q) ||
        entry.url.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q)
      );
    });
  }, [entries, query, activeCategory]);

  const visibleCategories =
    activeCategory === "전체" ? categories : categories.filter((c) => c === activeCategory);

  return (
    <div {...componentMarker("UiMapExplorer", "components/developer/UiMapExplorer.tsx")}>
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="화면 이름, URL, 설명으로 검색..."
          className="w-full sm:max-w-sm rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />

        <div className="flex flex-wrap gap-2">
          {["전체", ...categories].map((category) => {
            const isActive = category === activeCategory;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {visibleCategories.map((category) => {
          const categoryEntries = filtered.filter((entry) => entry.category === category);

          return (
            <section key={category}>
              <h2 className="text-xl font-bold mb-3">{category}</h2>

              {categoryEntries.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {query ? "검색 결과가 없습니다." : "구현된 화면이 없습니다."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryEntries.map((entry) => {
                    const key = entryKey(entry);
                    const isPreviewOpen = previewKeys.has(key);

                    return (
                      <Card key={key}>
                        <h3 className="text-lg font-bold mb-1">{entry.name}</h3>
                        <p className="text-xs text-green-400 font-mono mb-3">{entry.url}</p>
                        <p className="text-sm text-gray-400 mb-4">{entry.description}</p>
                        {entry.openUrl ? (
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={entry.openUrl}
                              className="inline-block rounded bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-semibold transition-colors"
                            >
                              열기
                            </Link>
                            <button
                              type="button"
                              onClick={() => togglePreview(key)}
                              className={`inline-block rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                                isPreviewOpen
                                  ? "bg-gray-700 text-white"
                                  : "border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                              }`}
                            >
                              {isPreviewOpen ? "미리보기 닫기" : "미리보기"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">이동 불가</span>
                        )}

                        {isPreviewOpen && entry.openUrl && (
                          <div
                            className="mt-4 rounded-lg overflow-hidden border border-gray-800 bg-white"
                            style={{ height: 480 }}
                          >
                            <iframe
                              src={entry.openUrl}
                              title={`${entry.name} 미리보기`}
                              className="w-full h-full"
                            />
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
