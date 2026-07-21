import fs from "fs";
import path from "path";
import type { DocEntry } from "@/components/developer/DocList";

const PREVIEW_LIMIT = 3000;

/** Phase UI(Analysis/Planning/Deployment)가 기존 문서를 그대로 읽어 보여주기 위한 fs 헬퍼.
 * 새 문서 생성·가공 로직 없음 — 이미 존재하는 파일을 읽기만 한다. */
export function readDocEntry(label: string, absolutePath: string, displayPath: string): DocEntry {
  if (!fs.existsSync(absolutePath)) {
    return {
      label,
      path: displayPath,
      exists: false,
      title: null,
      updatedAt: null,
      sizeBytes: null,
      preview: null,
      truncated: false,
    };
  }

  const stat = fs.statSync(absolutePath);
  const raw = fs.readFileSync(absolutePath, "utf-8");
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const truncated = raw.length > PREVIEW_LIMIT;

  return {
    label,
    path: displayPath,
    exists: true,
    title: titleMatch ? titleMatch[1].trim() : null,
    updatedAt: stat.mtime.toISOString(),
    sizeBytes: stat.size,
    preview: raw.slice(0, PREVIEW_LIMIT),
    truncated,
  };
}

export function joinRepoPath(repoRoot: string, ...segments: string[]): { absolute: string; display: string } {
  return {
    absolute: path.join(repoRoot, ...segments),
    display: segments.join("/"),
  };
}
