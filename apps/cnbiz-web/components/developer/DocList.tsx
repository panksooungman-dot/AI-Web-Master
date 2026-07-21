"use client";

import { useState } from "react";
import { Card } from "@/components/developer/Card";
import { Badge } from "@/components/developer/Badge";
import { componentMarker } from "@/lib/dev/component-marker";

export interface DocEntry {
  label: string;
  path: string;
  exists: boolean;
  title: string | null;
  updatedAt: string | null;
  sizeBytes: number | null;
  preview: string | null;
  truncated: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

/** 기존 문서(fs 원본)를 그대로 읽어와 카드 목록 + 원문 미리보기로 보여준다.
 * UiMapExplorer의 미리보기 토글 패턴을 문서 뷰어용으로 재사용. */
export function DocList({ docs }: { docs: DocEntry[] }) {
  const [openPaths, setOpenPaths] = useState<Set<string>>(new Set());

  function togglePreview(path: string) {
    setOpenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  return (
    <div {...componentMarker("DocList", "components/developer/DocList.tsx")} className="flex flex-col gap-3">
      {docs.map((doc) => {
        const isOpen = openPaths.has(doc.path);

        return (
          <Card key={doc.path}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">{doc.label}</h3>
                  {!doc.exists && <Badge tone="danger">파일 없음</Badge>}
                </div>
                <p className="text-xs text-gray-500 font-mono mt-1">{doc.path}</p>
                {doc.exists && (
                  <p className="text-xs text-gray-600 mt-1">
                    {doc.sizeBytes !== null && formatSize(doc.sizeBytes)}
                    {doc.updatedAt && ` · 최종 수정 ${new Date(doc.updatedAt).toLocaleString()}`}
                  </p>
                )}
              </div>

              {doc.exists && doc.preview && (
                <button
                  onClick={() => togglePreview(doc.path)}
                  className={`shrink-0 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isOpen
                      ? "bg-gray-700 text-white"
                      : "border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {isOpen ? "미리보기 닫기" : "미리보기"}
                </button>
              )}
            </div>

            {isOpen && doc.preview && (
              <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3 max-h-96 overflow-y-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words font-mono">
                  {doc.preview}
                  {doc.truncated && "\n\n… (이하 생략 — 전체 내용은 저장소 파일 참고)"}
                </pre>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
