/**
 * Display-only labels for the CLI's website types. Kept in sync with
 * packages/cli/src/website/types.ts (WEBSITE_TYPES) — this is a small list
 * of strings for the dashboard UI, not the generation logic itself, which
 * lives entirely in the CLI and is invoked via child process (see registry.ts).
 */
export const WEBSITE_TYPES = [
  { id: "website", label: "범용 웹사이트" },
  { id: "landing", label: "랜딩 페이지" },
  { id: "portfolio", label: "포트폴리오" },
  { id: "corporate", label: "기업 홈페이지" },
  { id: "agency", label: "에이전시" },
  { id: "dental", label: "치과" },
  { id: "hospital", label: "병원" },
  { id: "restaurant", label: "레스토랑" },
  { id: "shopping", label: "쇼핑몰" },
  { id: "blog", label: "블로그" },
  { id: "education", label: "교육" },
] as const;

export type WebsiteTypeId = (typeof WEBSITE_TYPES)[number]["id"];
