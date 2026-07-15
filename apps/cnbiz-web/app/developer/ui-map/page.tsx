import fs from "node:fs";
import path from "node:path";
import { PageHeader } from "@/components/developer/PageHeader";
import { StatusMessage } from "@/components/developer/StatusMessage";
import { UiMapExplorer, type UiMapEntry } from "@/components/developer/UiMapExplorer";
import { resolveRepoRoot } from "@/lib/paths/repoRoot";

const CATEGORY_ORDER = ["프로젝트 관리", "고객관리", "AI", "인증", "관리자", "개발자", "설정"];

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, "").replace(/`/g, "").trim();
}

function resolveOpenUrl(url: string): string | null {
  if (!url || url === "—") return null;
  if (url.includes("[")) {
    const parent = url.split("/").slice(0, -1).join("/");
    return parent || "/";
  }
  return url;
}

function parseUiMapEntries(markdown: string): UiMapEntry[] {
  const entries: UiMapEntry[] = [];
  let currentCategory: string | null = null;
  let tableLines: string[] = [];

  const flush = () => {
    if (!currentCategory) return;
    const category = currentCategory;
    const dataRows = tableLines.slice(2);

    for (const row of dataRows) {
      const cells = row
        .split("|")
        .slice(1, -1)
        .map((cell) => stripMarkdown(cell));

      if (cells.length < 6) continue;

      const [name, url, , , , description] = cells;
      if (name === "—" || url === "—") continue;

      entries.push({ category, name, url, description, openUrl: resolveOpenUrl(url) });
    }

    tableLines = [];
  };

  for (const line of markdown.split("\n")) {
    const headingMatch = line.match(/^##\s+\d+\.\s+(.+)$/);

    if (headingMatch) {
      flush();
      const heading = headingMatch[1].trim();
      currentCategory = CATEGORY_ORDER.find((category) => heading.startsWith(category)) ?? null;
      continue;
    }

    if (currentCategory && line.trim().startsWith("|")) {
      tableLines.push(line);
    }
  }

  flush();
  return entries;
}

export default function UiMapPage() {
  const filePath = path.join(resolveRepoRoot(), "docs", "UI_MAP.md");

  let entries: UiMapEntry[] | null = null;
  let loadError: string | null = null;

  try {
    const markdown = fs.readFileSync(filePath, "utf-8");
    entries = parseUiMapEntries(markdown);
  } catch {
    loadError = "docs/UI_MAP.md 파일을 읽지 못했습니다.";
  }

  return (
    <div>
      <PageHeader title="UI Explorer" description="docs/UI_MAP.md 기준 — 카테고리별 화면 목록" />

      {loadError && <StatusMessage tone="error">{loadError}</StatusMessage>}

      {entries && <UiMapExplorer entries={entries} categories={CATEGORY_ORDER} />}
    </div>
  );
}
